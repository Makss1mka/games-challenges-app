"""
Games schemas
"""

import uuid
from pydantic import BaseModel, Field


#
# RESPONSES
#

class GameResponseModel(BaseModel):
    id: uuid.UUID = Field(...)
    name: str = Field(...)
    author_name: str = Field(...)

    class Config:
        from_attributes = True

