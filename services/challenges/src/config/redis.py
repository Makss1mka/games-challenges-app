"""
Redis setup
"""

import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Request
from redis.asyncio import ConnectionPool, Redis

logger: logging.Logger = logging.getLogger(__name__)


@dataclass
class RedisPoolConfig:
    password: Optional[str] = None
    max_connections: int = 10
    socket_timeout: int = 5
    socket_connect_timeout: int = 5
    health_check_interval: int = 30
    decode_responses: bool = True


@asynccontextmanager
async def init_redis(app: FastAPI, connection_url: str, pool_config: RedisPoolConfig) -> None:
    logger.info("Start Redis initializing...")

    pool = ConnectionPool.from_url(
        connection_url,
        max_connections=pool_config.max_connections,
        socket_timeout=pool_config.socket_timeout,
        socket_connect_timeout=pool_config.socket_connect_timeout,
        health_check_interval=pool_config.health_check_interval,
        decode_responses=pool_config.decode_responses,
    )

    redis_client = Redis(connection_pool=pool)

    app.state.redis_pool = pool
    app.state.redis_client = redis_client

    # Check if redis reachable
    try:
        logger.debug("Checking if Redis is reachable...")
        await redis_client.ping()
        logger.debug("Redis is reachable")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        await pool.disconnect()
        raise Exception("Failed to connect to Redis") from e

    logger.info("Redis pool initialized")
    yield

    if hasattr(app.state, "redis_pool"):
        logger.info("Closing Redis connection pool...")
        await app.state.redis_pool.disconnect()
        logger.info("Redis connection was closed")


async def get_redis_client(request: Request) -> AsyncGenerator[Redis, None]:
    yield request.app.state.redis_client
