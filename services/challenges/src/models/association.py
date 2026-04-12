"""
Association tables
"""

from sqlalchemy import Table, Column, ForeignKey
from src.models.base import BaseModel

challenge_tags = Table(
    "challenge_tags",
    BaseModel.metadata,
    Column("challenge_id", ForeignKey("challenges.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)

