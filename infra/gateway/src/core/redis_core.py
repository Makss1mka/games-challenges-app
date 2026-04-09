from fastapi import FastAPI, Request
from typing import AsyncGenerator
from redis.asyncio import Redis
import logging

logger: logging.Logger = logging.getLogger(__name__)


async def redis_client_init(
    app: FastAPI,
    redis_host: str, 
    redis_port: int
):
    app.state.redis_client = Redis(
        host=redis_host,
        port=redis_port
    )


async def get_redis_client(req: Request) -> AsyncGenerator[Redis, None]:
    yield req.app.state.redis_client
    


