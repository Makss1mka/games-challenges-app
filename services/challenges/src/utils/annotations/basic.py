"""
Base annotations
"""

from typing import Annotated, Type

from fastapi import Depends, Query
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.db import get_db_session, get_db_session_class
from src.middlewares.auth import extract_user_context
from src.config.redis import get_redis_client


def get_common_params(
    page_number: int = Query(1, ge=0),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query(None),
    sort_order: str = Query(None)
):
    return {
        "page_number": page_number,
        "page_size": page_size,
        "sort_by": sort_by,
        "sort_order": sort_order
    }

CommonParams = Annotated[dict, Depends(get_common_params)]
RedisDep = Annotated[Redis, Depends(get_redis_client)]
SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
SessionClassDep = Annotated[Type[AsyncSession], Depends(get_db_session_class)]
UserContext = Annotated[object, Depends(extract_user_context)]

