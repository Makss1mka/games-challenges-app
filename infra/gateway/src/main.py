from src.api.main_proxy_api import main_router
# from src.api.auth_api import auth_router
from src.core.logging_core import setup_logging
# from src.core.proxy_session_core import proxy_client_session_init
from src.exceptions.code_exceptions import CodeException
from src.exceptions.exception_handlers import (
    pydantic_validation_exception_handler,
    exception_handler,
    code_exception_handler,
)

from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from typing import AsyncIterator
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv

import logging

load_dotenv()


LOGS_LEVEL: int = logging.DEBUG
LOGS_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging(logs_level=LOGS_LEVEL, logs_format=LOGS_FORMAT)

    logger: logging.Logger = logging.getLogger(__name__)

    logger.info(f"Server is started")
    yield
    logger.error("Server shutdown...")


app = FastAPI(lifespan=app_lifespan)

# app.include_router(auth_router)
app.include_router(main_router)
# app.include_router(system_router)

app.add_exception_handler(RequestValidationError, pydantic_validation_exception_handler)
app.add_exception_handler(CodeException, code_exception_handler)
app.add_exception_handler(Exception, exception_handler)

