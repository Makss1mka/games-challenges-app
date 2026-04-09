from src.exceptions.code_exceptions import CodeException

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Request

import logging

logger: logging.Logger = logging.getLogger(__name__)

async def code_exception_handler(req: Request, ex: CodeException):
    logger.debug(f"CODE EXCEPTION: {ex.status_code} | {ex.message}")

    return JSONResponse(
        status_code=ex.status_code,
        content={
            "status": "exception",
            "data": ex.message,
        }
    )

async def pydantic_validation_exception_handler(req: Request, ex: RequestValidationError):
    logger.debug(f"VALIDATION EXCEPTION: {ex.errors} | {ex.__traceback__}")

    error_messages = ""
    isFirst = True
    for error in ex.errors():
        if isFirst:
            isFirst = False
        else:
            error_messages += "\n"
        error_message = error.get("msg")
        error_messages += error_message 
            

    return JSONResponse(
        status_code=400,
        content={
            "status": "exception",
            "data": error_messages,
        }
    )

async def exception_handler(req: Request, ex: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": "exception",
            "data": "Internal server error",
        }
    )

