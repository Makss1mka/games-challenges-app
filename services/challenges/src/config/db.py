"""
Database setup.
"""

import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import AsyncGenerator, Type

from fastapi import FastAPI, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

logger: logging.Logger = logging.getLogger(__name__)


@dataclass
class DbPoolConfig:
    pool_size: int = 10
    max_overflows: int = 1
    pool_timeout: int = 10
    pool_recycle: int = 10
    pool_pre_ping: int = 10
    echo: bool = False
    echo_pool: bool = False
    hide_parameters: bool = True


@asynccontextmanager
async def init_db(app: FastAPI, connection_url: str, pool_config: DbPoolConfig) -> None:
    logger.info(f"Initializing database engine")

    app.state.db_engine = create_async_engine(
        connection_url,
        pool_size=pool_config.pool_size,
        max_overflow=pool_config.max_overflows,
        pool_timeout=pool_config.pool_timeout,
        pool_recycle=pool_config.pool_recycle,
        pool_pre_ping=pool_config.pool_pre_ping,
        echo=pool_config.echo,
        echo_pool=pool_config.echo_pool,
        hide_parameters=pool_config.hide_parameters,
    )

    app.state.Session = sessionmaker(app.state.db_engine, class_=AsyncSession, expire_on_commit=False)

    logger.info("Database engine initialized")

    # Check if the database is reachable
    try:
        logger.debug("Checking if the database is reachable...")

        async with app.state.Session() as session:
            await session.execute(text("SELECT 1"))

        logger.debug("Database is reachable")
    except Exception as e:
        logger.error(f"Failed to connect to the database: {e}")
        raise Exception("Failed to connect to the database") from e

    logger.info("Database is initialized")

    yield

    if hasattr(app.state, "db_engine"):
        logger.info("Closing database engine...")
        await app.state.db_engine.dispose()
        logger.info("Database engine closed")
    else:
        logger.warning("No database engine found in app.state to close")


async def get_db_session(req: Request) -> AsyncGenerator[AsyncSession, None]:
    async with req.app.state.Session() as session:
        yield session


async def get_db_session_class(req: Request) -> AsyncGenerator[Type[AsyncSession], None]:
    return req.app.state.Session
