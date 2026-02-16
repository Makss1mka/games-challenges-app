"""
Game model
"""

from typing import List
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import BaseModel


class Game(BaseModel):
    __tablename__ = "games"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    author_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    chalenges: Mapped[List["Chalenge"]] = relationship("Chelenge", uselist=True, back_populates="game")
