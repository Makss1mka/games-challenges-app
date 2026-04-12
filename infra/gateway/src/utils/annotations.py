from src.core.proxy_session_core import get_proxy_client_session
from src.core.redis_core import get_redis_client
from fastapi import Depends
from redis.asyncio import Redis
from typing import Annotated
import aiohttp

RedisClient = Annotated[
    Redis,
    Depends(get_redis_client)
]

ClientSession = Annotated[
    aiohttp.ClientSession,
    Depends(get_proxy_client_session)
]
