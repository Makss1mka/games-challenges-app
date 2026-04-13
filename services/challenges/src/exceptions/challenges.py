"""
Challenges common exceptions
"""

from fastapi import HTTPException, status


class ChallengeNotExistsException(HTTPException):
    def __init__(self, detail: str = "Challenge not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ChallengeInvalidContentOrderException(HTTPException):
    def __init__(self, detail: str = "Invalid content block order position"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ChallengeContentFileException(HTTPException):
    def __init__(self, detail: str = "Invalid content file"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        

class ChallengeUnsupportedFileExtensionException(HTTPException):
    def __init__(self, detail: str = "Unsupported file extension. Allowed only: .jpeg, .jpg, .png"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ChallengeInvalidBodyDataException(HTTPException):
    def __init__(self, detail: str = "Invalid body data"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ChallengePictureNotProvidedException(HTTPException):
    def __init__(self, detail: str = "Picture not provided"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ChallengeAccessDeniedException(HTTPException):
    def __init__(self, detail: str = "You dont have access for this"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ChallengeFileNotFoundException(HTTPException):
    def __init__(self, detail: str = "Challenge file not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ChallengeInvalidFilePathException(HTTPException):
    def __init__(self, detail: str = "Invalid file path"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ChallengeFileIsDirectoryException(HTTPException):
    def __init__(self, detail: str = "File is not a file is a directory"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)



