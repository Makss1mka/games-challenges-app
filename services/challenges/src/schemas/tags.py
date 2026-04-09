"""
Tags schemas
"""

import uuid
from pydantic import BaseModel, Field

from src.utils.enums import ChallengeStatusEnum


#
# REQUESTS
#

class TagCreateRequestModel(BaseModel):
    pass


class TagUpdateRequestModel(BaseModel):
    pass


#
# RESPONSES
#

class TagResponseModel(BaseModel):
    id: uuid.UUID = Field(...)
    name: str = Field(...) 

    class Config:
        from_attributes = True
