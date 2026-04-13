from enum import Enum

class UserRole(str, Enum):
    GUEST = "GUEST"
    USER = "USER"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"
    BANNED = "BANNED"
