"""
Game common exceptions
"""

from fastapi import HTTPException, status


class UserAccessfailedException(HTTPException):
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class UserInvalidDataException(HTTPException):
    def __init__(self, detail: str = "Invalid user data"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

