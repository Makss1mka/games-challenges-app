"""
Logging setup.
"""

from fastapi.logger import logger as fastapi_logger
import logging
import sys

def setup_logging(
    logs_level: int,
    logs_format: str
) -> None:
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.handlers.clear()

    formatter = logging.Formatter(logs_format)

    # Simple console/stdout logging
    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.setLevel(logs_level)
    logger.addHandler(stdout_handler)

    fastapi_logger.handlers = logger.handlers
    fastapi_logger.setLevel(logs_level)
