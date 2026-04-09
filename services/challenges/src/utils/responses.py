"""
Response models
"""

import logging
from datetime import datetime, timezone
from typing import Generic, Optional, TypeVar

from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.utils.enums import ResponseTextStatus

logger = logging.getLogger(__name__)


T = TypeVar("T")
V = TypeVar("V")


class CommonResponseWrapper(BaseModel, Generic[T]):
    """
    Common response wrapper model
    """

    status: ResponseTextStatus
    data: Optional[T] = None
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommonJSONResponse(JSONResponse, Generic[V]):
    """
    Custom json response class
    """

    def __init__(
        self,
        content: V,
        status_code: int = status.HTTP_200_OK,
        headers: Optional[dict] = None,
        message: Optional[str] = None,
        background=None,
        **kwargs,
    ):
        if status_code >= 400:
            response_status = ResponseTextStatus.EXCEPTION
        else:
            response_status = ResponseTextStatus.SUCCESS

        wrapped_content = CommonResponseWrapper(
            status=response_status,
            data=content,
            message=message,
        ).model_dump(exclude_none=True, mode="json")

        if status_code >= 400:
            logger.error(f"Error response: {wrapped_content}")

        super().__init__(
            content=wrapped_content,
            status_code=status_code,
            headers=headers,
        )

