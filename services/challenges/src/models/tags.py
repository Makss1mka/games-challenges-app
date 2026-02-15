"""
Tag model
"""

from typing import List
import uuid
from sqlalchemy import UUID, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.utils.enums import TagStatusEnum
from src.models.base import BaseModel


class Tag(BaseModel):
    __tablename__ = "tags"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)

    name: Mapped[str] = mapped_column(String(250), nullable=False, unique=True)
    status: Mapped[TagStatusEnum] = mapped_column(Enum(TagStatusEnum), default=TagStatusEnum.ACTIVE, nullable=False)

    chalenges: Mapped[List["Chalenge"]] = relationship("Chalenge", uselist=True, back_populates="tags")

