"""
User statuses models
"""

import uuid
from sqlalchemy import UUID, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.utils.enums import UserChalengeStatusEnum
from src.models.base import BaseModel


class ChalengeCommentLike(BaseModel):
    __tablename__ = "chalenges_comments_likes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    comment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=False)

    comment: Mapped["ChalengeComment"] = relationship("ChalengeComment", uselist=False, back_populates="likes")


class ChalengeCommentDislike(BaseModel):
    __tablename__ = "chalenges_comments_dislikes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    comment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=False)

    comment: Mapped["ChalengeComment"] = relationship("ChalengeComment", uselist=False, back_populates="dislikes")


class ChalengeLike(BaseModel):
    __tablename__ = "chalenges_likes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    chalenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=False)

    chalenge: Mapped["Chalenge"] = relationship("Chalenge", uselist=False, back_populates="likes")


class ChalengeDislike(BaseModel):
    __tablename__ = "chalenges_dislikes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    chalenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=False)

    chalenge: Mapped["Chalenge"] = relationship("Chalenge", uselist=False, back_populates="dislikes")


class UserChalengeStatus(BaseModel):
    __tablename__ = "users_chalenges_statuses"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    chalenge_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chalenges_comments.id"), nullable=False)
    status: Mapped[UserChalengeStatusEnum] = mapped_column(Enum(UserChalengeStatusEnum), nullable=False)

    chalenge: Mapped["Chalenge"] = relationship("Chalenge", uselist=False, back_populates="statuses")

