"""
Comments models
"""

from typing import Optional, List
import uuid
from sqlalchemy import UUID, CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class ChalengeComment(BaseModel):
    __tablename__ = "chalenges_comments"

    chalenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    parent_comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=True)

    text: Mapped[str] = mapped_column(String(1000), nullable=False, default="")
    dificulty_rate: Mapped[str] = mapped_column(Integer, nullable=True, default=None)
    likes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dislikes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    chalenge: Mapped["Chalenge"] = relationship("Chalenge", uselist=False, back_populates="comments")
    parent_comment: Mapped["ChalengeComment"] = relationship("ChalengeComment", uselist=False, back_populates="child_comments")
    child_comments: Mapped[List["ChalengeComment"]] = relationship("ChalengeComment", uselist=True, back_populates="parent_comment") 
    likes: Mapped[List["ChalengeCommentLike"]] = relationship("ChalengeCommentLike", uselist=True, back_populates="comment")
    dislikes: Mapped[List["ChalengeCommentLike"]] = relationship("ChalengeCommentLike", uselist=True, back_populates="comment")

    __table_args__ = (
        CheckConstraint("likes_count >= 0", name="check_chalenge_comment_likes_positive"),
        CheckConstraint("dislikes_count >= 0", name="check_chalenge_comment_dislikes_positive"),
        CheckConstraint("dificulty_rate >= 0 AND dificulty_rate <= 5", name="check_chalenge_comment_dificulty_rate_range"),
    )

