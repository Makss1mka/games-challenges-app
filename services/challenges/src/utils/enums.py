"""
Enum classes
"""

from enum import StrEnum


class ChalengeStatusEnum(StrEnum):
    """
    Enum for users chalenges
    """

    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"
    BLOCKED = "BLOCKED"
    ON_APILATION = "ON_APILATION"


class TagStatusEnum(StrEnum):
    """
    Enum for users tags
    """

    ACTIVE = "ACTIVE"
