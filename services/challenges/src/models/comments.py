"""
Challenge comments model
"""

import uuid
from sqlalchemy import ForeignKey, String, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class ChallengeComment(BaseModel):
    __tablename__ = "challenge_comments"

    challenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("challenges.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    author_name: Mapped[str] = mapped_column(String(250), nullable=False)
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    attachments: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="comments")
