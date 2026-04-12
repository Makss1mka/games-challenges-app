"""
Game common exceptions
"""

from fastapi import HTTPException, status


class GameNotExistsException(HTTPException):
    def __init__(self, detail: str = "Game not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


