"""
Enum classes
"""

from enum import StrEnum


class UserChalengeStatusEnum(StrEnum):
    """
    Enum for users chalenges statuses
    """

    DROPED = "DROPED"
    COMPLETED = "COMPLETED"
    IN_PROGRESS = "IN_PROGRESS"
    FAVOURITE = "FAVOURITE"
