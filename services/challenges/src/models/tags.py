"""
Tag model
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.association import challenge_tags
from src.models.base import BaseModel


class Tag(BaseModel):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(250), nullable=False, unique=True)

    challenges: Mapped[list["Challenge"]] = relationship("Challenge", secondary=challenge_tags, back_populates="tags")
