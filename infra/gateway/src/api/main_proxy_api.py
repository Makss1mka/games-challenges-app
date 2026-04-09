from src.exceptions.code_exceptions import NotFoundException, GatewayTimeoutException
from src.services.token_service import TokenService

from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import StreamingResponse
from urllib.parse import urljoin
from multidict import MultiDict
import asyncio
import logging
import httpx
import json
import re


main_router = APIRouter()
logger = logging.getLogger("main_router")

SERVICES_URLS = {
    "auth": "http://users-api:8080",
    "me": "http://users-api:8080",
    "users": "http://users-api:8080",
    "games": "http://games-api:8080",
    "library": "http://games-api:8080",
    "challenges": "http://challenges-api:8080",
}

AUTH_FREE_ROUTES = [
    ["POST", r"^/api/auth/register$"],
    ["POST", r"^/api/auth/login$"],
    ["POST", r"^/api/auth/refresh$"],
    ["GET", r"^/api/games$"],
    ["GET", r"^/api/games/[0-9a-fA-F-]{36}$"],
    ["GET", r"^/api/games/slug/[^/]+$"],
    ["GET", r"^/api/games/tags$"],
    ["GET", r"^/api/challenges/file/.+$"],
    ["GET", r"^/api/challenges/[0-9a-fA-F-]{36}$"],
    ["GET", r"^/api/challenges/search$"]
]


async def is_auth_free(path: str, method: str) -> bool:
    return any(
        (
            pattern[0] == method
            and re.match(pattern[1], path)
        )
        for pattern in AUTH_FREE_ROUTES
    )


@main_router.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def gateway_router(request: Request, path: str):
    full_path = f"/api/{path}"
    
    root_path = path.split('/')[0]
    target_base_url = SERVICES_URLS.get(root_path)
    
    if not target_base_url:
        raise HTTPException(status_code=404, detail="Service not found")

    req_headers = MultiDict(request.headers)
    
    if not await is_auth_free(path=full_path, method=request.method):
        temp_resp = Response()
        token_service = TokenService(request, temp_resp)
        await token_service.add_user_context(req_headers)

    target_url = f"{target_base_url}{full_path}"
    logger.debug(f"Target url {target_url}")

    async with httpx.AsyncClient() as client:
        content = await request.body()
        params = request.query_params
        
        try:
            proxy_res = await client.request(
                method=request.method,
                url=target_url,
                headers=req_headers,
                params=params,
                content=content,
                timeout=10.0
            )
            
            return Response(
                content=proxy_res.content,
                status_code=proxy_res.status_code,
                headers=MultiDict(proxy_res.headers)
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Service unavailable: {str(exc)}")





# @main_router.api_route("/api/{domen}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
# async def proxy_api(
#     domen: str,
#     path: str,
#     req: Request,
#     resp: Response,
#     client_session: ClientSession
# ):
#     if service not in SERVICES_URLS:
#         raise NotFoundException("Cannot find such service!")

#     token_service = TokenService(req, resp)
#     req_headers = dict(req.headers)
    
#     await token_service.add_user_context(req_headers)

#     target_url = urljoin(SERVICES_URLS[service], path)
#     logger.debug(f"Routing to {target_url}")

#     body = await req.body()

#     response = await client_session.request(
#         method=req.method,
#         url=target_url,
#         headers=req_headers,
#         data=body,
#         params=req.query_params,
#         timeout=SERVICE_NOT_RESPONDING_TIMEOUT
#     )

#     try:
#         returned_headers = MultiDict(response.headers)
#         replace_trace_id(returned_headers)

#         for header_name, value in returned_headers.items():
#             if header_name.lower() in ALLOWED_RETURNING_HEADERS:
#                 resp.headers[header_name] = value

#         content_type = resp.headers.get("Content-Type", "").lower()

#         if "application/json" in content_type:
#             content = await response.read()
#             try:
#                 json_data = json.loads(content)
#                 resp.status_code = response.status
#                 await response.release()
#                 return json_data
#             except json.JSONDecodeError as e:
#                 await response.release()
#                 logger.error(f"Invalid JSON from {target_url}: {e}")
#                 raise HTTPException(502, "Invalid JSON from service")

#         else:
#             async def _final_stream():
#                 try:
#                     async for chunk in response.content.iter_chunked(1024 * 64):
#                         yield chunk
#                 except Exception as e:
#                     logger.error(f"Streaming error: {e}")
#                     raise
#                 finally:
#                     await response.release()

#             return StreamingResponse(
#                 content=_final_stream(),
#                 status_code=response.status,
#                 headers=dict(resp.headers),
#                 media_type=content_type.split(";")[0] or "application/octet-stream"
#             )

#     except asyncio.TimeoutError:
#         await response.release()
#         logger.error(f"Timeout for {target_url}")
#         raise GatewayTimeoutException("Service is not responding")
#     except aiohttp.ClientError as e:
#         await response.release()
#         logger.error(f"Client error for {target_url}: {e}")
#         raise HTTPException(502, "Bad gateway")
#     except Exception as e:
#         await response.release()
#         logger.error(f"Unexpected error in proxy to {target_url}: {e}")
#         raise HTTPException(500, "Internal proxy error")

