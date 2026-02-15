"""
Chalenge model
"""

from typing import Optional, List
import uuid
from sqlalchemy import ARRAY, JSON, UUID, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.utils.enums import ChalengeStatusEnum
from src.models.base import BaseModel


class Chalenge(BaseModel):
    __tablename__ = "chalenges"

    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    
    name: Mapped[str] = mapped_column(String(250), nullable=False, unique=True)
    status: Mapped[ChalengeStatusEnum] = mapped_column(Enum(ChalengeStatusEnum), default=ChalengeStatusEnum.PUBLIC)
    desciption: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    tags: Mapped[List[str]] = mapped_column(ARRAY(String(30)), default=[], nullable=False)

    card_description: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    card_picture_url: Mapped[Optional[str]] = mapped_column(String(250), nullable=True, default=None)

    game: Mapped["Game"] = relationship("Game", uselist=False, back_populates="chalenges")
    tags: Mapped[List["Tag"]] = relationship("Tag", uselist=True, back_populates="chalenges")
