from src.exceptions.code_exceptions import UnauthorizedException

from fastapi import Request, Response
import logging
import jwt
import os

logger = logging.getLogger(__name__)

TOKEN_SECRET = os.environ.get("Jwt__Secret") or os.environ.get("SECRET")
TOKEN_EXPECTED_AUDIENCE = os.environ.get("Jwt__Audience") or os.environ.get("TOKEN_AUDIENCE")

USER_ID_HEADER_NAME = "x-user-id"
USER_NAME_HEADER_NAME = "x-user-name"
USER_ROLE_HEADER_NAME = "x-user-role"
USER_EMAIL_HEADER_NAME = "x-user-email"

USER_ID_TOKEN_FIELD_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
USER_NAME_TOKEN_FIELD_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
USER_EMAIL_TOKEN_FIELD_NAME = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
USER_ROLE_TOKEN_FIELD_NAME = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"


class TokenService:
    def __init__(self, req: Request, resp: Response):
        self._req = req
        self._resp = resp
    

    async def _decode_access_token(self, token: str) -> dict:
        if not TOKEN_SECRET:
            raise UnauthorizedException("Access token secret is not configured")

        if not TOKEN_EXPECTED_AUDIENCE:
            raise UnauthorizedException("Access token audience is not configured")

        try:
            payload = jwt.decode(
                token,
                TOKEN_SECRET,
                algorithms=["HS256"],
                audience=TOKEN_EXPECTED_AUDIENCE
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise UnauthorizedException("Access token has expired")
        except jwt.InvalidTokenError as e:
            logger.debug(f"Some token error: {e}")
            raise UnauthorizedException("Access token is invalid")
   

    async def add_user_context(self, headers: dict) -> None:
        token = self._req.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            raise UnauthorizedException("Access token is missing")

        user_data = await self._decode_access_token(token)

        try:
            headers[USER_ID_HEADER_NAME] = user_data[USER_ID_TOKEN_FIELD_NAME]
            headers[USER_NAME_HEADER_NAME] = user_data[USER_NAME_TOKEN_FIELD_NAME]
            headers[USER_ROLE_HEADER_NAME] = user_data[USER_ROLE_TOKEN_FIELD_NAME]
            headers[USER_EMAIL_HEADER_NAME] = user_data[USER_EMAIL_TOKEN_FIELD_NAME]
        except Exception as e:
            logger.debug(f"Error while try to add user context. {e}")
            raise UnauthorizedException("Invalid token data")

