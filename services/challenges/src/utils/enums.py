"""
Enum classes
"""

from enum import StrEnum


class ChallengeStatusEnum(StrEnum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    BLOCKED = "BLOCKED"
    ON_APILATION = "ON_APILATION"


class TagStatusEnum(StrEnum):
    ACTIVE = "ACTIVE"


class ResponseStatus(StrEnum):
    SUCCESS = "success"
    EXCEPTION = "exception"


class ResponseDataType(StrEnum):
    STRING = "str"
    JSON = "json"


class UserRole(StrEnum):
    GUEST = "Guest"
    USER = "User"
    ADMIN = "Admin"


class UserStatus(StrEnum):
    BLOCKED = "BLOCKED"
    ACTIVE = "ACTIVE"


class ResponseTextStatus(StrEnum):
    SUCCESS = "success"
    EXCEPTION = "exception"


class ChallengeContentBlockType(StrEnum):
    TEXT = "text"
    PICTURE = "picture"
    LINK = "link"
