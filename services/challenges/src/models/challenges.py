"""
Challenge model
"""

from re import L
from typing import Optional
import uuid
from sqlalchemy import ARRAY, JSON, UUID, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.association import challenge_tags
from src.utils.enums import ChallengeStatusEnum
from src.models.base import BaseModel


class Challenge(BaseModel):
    __tablename__ = "challenges"

    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    
    author_name: Mapped[str] = mapped_column(String(250), nullable=False)
    name: Mapped[str] = mapped_column(String(250), nullable=False)
    status: Mapped[ChallengeStatusEnum] = mapped_column(Enum(ChallengeStatusEnum), default=ChallengeStatusEnum.PUBLIC)
    description: Mapped[dict] = mapped_column(JSON, nullable=False, default={})

    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dislikes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    comments_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    card_description: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    card_picture_url: Mapped[Optional[str]] = mapped_column(String(250), nullable=True, default=None)

    game: Mapped["Game"] = relationship("Game", uselist=False, back_populates="challenges")
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary=challenge_tags, back_populates="challenges")
    comments: Mapped[list["ChallengeComment"]] = relationship(
        "ChallengeComment",
        uselist=True,
        back_populates="challenge",
        cascade="all, delete-orphan"
    )
    likes: Mapped[list["ChallengeLike"]] = relationship(
        "ChallengeLike",
        uselist=True,
        back_populates="challenge",
        cascade="all, delete-orphan"
    )
    dislikes: Mapped[list["ChallengeDislike"]] = relationship(
        "ChallengeDislike",
        uselist=True,
        back_populates="challenge",
        cascade="all, delete-orphan"
    )

    
