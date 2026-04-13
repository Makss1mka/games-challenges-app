"""Add comments and reactions

Revision ID: 5c4b6d6c0e9b
Revises: 04fc9adb75df
Create Date: 2026-04-13 07:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5c4b6d6c0e9b'
down_revision: Union[str, Sequence[str], None] = '04fc9adb75df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'challenge_comments',
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('author_name', sa.String(length=250), nullable=False),
        sa.Column('message', sa.String(length=2000), nullable=False),
        sa.Column('attachments', sa.JSON(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], name=op.f('fk_challenge_comments_challenge_id_challenges')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_challenge_comments'))
    )

    op.create_table(
        'challenge_likes',
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], name=op.f('fk_challenge_likes_challenge_id_challenges')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_challenge_likes')),
        sa.UniqueConstraint('challenge_id', 'user_id', name=op.f('uq_challenge_likes_user'))
    )

    op.create_table(
        'challenge_dislikes',
        sa.Column('challenge_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], name=op.f('fk_challenge_dislikes_challenge_id_challenges')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_challenge_dislikes')),
        sa.UniqueConstraint('challenge_id', 'user_id', name=op.f('uq_challenge_dislikes_user'))
    )


def downgrade() -> None:
    op.drop_table('challenge_dislikes')
    op.drop_table('challenge_likes')
    op.drop_table('challenge_comments')
