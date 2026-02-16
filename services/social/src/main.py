"""
Entrypoint 
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator
from fastapi import FastAPI

import logging


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger: logging.Logger = logging.getLogger(__name__)

    logger.info(f"Server is started")
    yield
    logger.error("Server shutdown...")


app = FastAPI(lifespan=app_lifespan)

@app.get("/ping")
async def ping():
    return {
        "status": "success",
        "message": "pong"
    }
