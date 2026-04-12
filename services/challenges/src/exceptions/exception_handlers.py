"""
Exception handlers
"""

import logging

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError

from src.utils.enums import ResponseTextStatus
from src.utils.responses import CommonJSONResponse

logger: logging.Logger = logging.getLogger(__name__)


async def http_exception_handler(req: Request, exc: HTTPException):
    """
    Exception handler for all HttpExceptions
    """

    return CommonJSONResponse(
        None,
        status_code=exc.status_code,
        message=exc.detail,
    )


async def pydantic_exception_handler(req: Request, exc: RequestValidationError):
    """
    Exception handler for pydantic validation exceptions
    """

    errors = []
    for error in exc.errors():
        field = " -> ".join(map(str, error.get("loc")))
        message = error.get("msg")
        error_type = error.get("type")

        errors.append({"field": field, "message": message, "type": error_type})

    return CommonJSONResponse(errors, status_code=status.HTTP_400_BAD_REQUEST, message="Validation failed")


async def common_exception_handler(req: Request, ex: Exception):
    """
    Common exception handler
    """

    return CommonJSONResponse(
        None,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Internal server error",
    )

