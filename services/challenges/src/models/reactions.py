"""
Challenge reactions models
"""

import uuid
from sqlalchemy import ForeignKey, UniqueConstraint, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class ChallengeLike(BaseModel):
    __tablename__ = "challenge_likes"
    __table_args__ = (
        UniqueConstraint("challenge_id", "user_id", name="uq_challenge_likes_user"),
    )

    challenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("challenges.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="likes")


class ChallengeDislike(BaseModel):
    __tablename__ = "challenge_dislikes"
    __table_args__ = (
        UniqueConstraint("challenge_id", "user_id", name="uq_challenge_dislikes_user"),
    )

    challenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("challenges.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="dislikes")
