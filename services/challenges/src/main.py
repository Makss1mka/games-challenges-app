"""
Entrypoint
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError

from src.config.db import DbPoolConfig, init_db
from src.config.logger import setup_logging
from src.config.redis import RedisPoolConfig, init_redis
from src.exceptions.exception_handlers import (
    common_exception_handler,
    http_exception_handler,
    pydantic_exception_handler,
)
from src.middlewares.auth import UserContextMiddleware
from src.routers.challenges import challenges_router
from src.routers.system import system_router


REDIS_URL: str = os.environ.get("REDIS_URL")
DB_URL: str = os.environ.get("DB_URL")

LOGS_LEVEL: int = logging.DEBUG
LOGS_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging(logs_level=LOGS_LEVEL, logs_format=LOGS_FORMAT)

    logger: logging.Logger = logging.getLogger(__name__)

    async with (
        init_db(app, connection_url=DB_URL, pool_config=DbPoolConfig()),
        init_redis(app, connection_url=REDIS_URL, pool_config=RedisPoolConfig()),
    ):
        logger.info(f"Server is started")
        yield
        logger.error("Server shutdown...")


app = FastAPI(lifespan=app_lifespan)

app.add_middleware(UserContextMiddleware)

app.add_exception_handler(RequestValidationError, pydantic_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, common_exception_handler)

app.include_router(challenges_router, prefix="/api/challenges")
app.include_router(system_router, prefix="/api")
