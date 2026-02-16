"""
Chalenge model
"""

from typing import List
import uuid
from sqlalchemy import UUID, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class Chalenge(BaseModel):
    __tablename__ = "chalenges"

    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    
    comments: Mapped["ChalengeComment"] = relationship("ChalengeComment", uselist=True, back_populates="chalenge")
    likes: Mapped[List["ChalengeLike"]] = relationship("ChalengeLike", uselist=True, back_populates="chalenge")
    dislikes: Mapped[List["ChalengeDislike"]] = relationship("ChalengeDislike", uselist=True, back_populates="chalenge")
    statuses: Mapped[List["UserChalengeStatus"]] = relationship("UserChalengeStatus", uselist=True, back_populates="chalenge")
