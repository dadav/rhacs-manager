"""Add scope_namespaces to badge_tokens

Revision ID: 008
Revises: 007
Create Date: 2026-03-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "badge_tokens",
        sa.Column("scope_namespaces", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("badge_tokens", "scope_namespaces")
