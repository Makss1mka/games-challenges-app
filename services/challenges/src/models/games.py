"""
Game model
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class Game(BaseModel):
    __tablename__ = "games"
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    challenges: Mapped[list["Challenge"]] = relationship("Challenge", uselist=True, back_populates="game")
