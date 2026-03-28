"""Add mention notification type

Revision ID: 014
Revises: 013
Create Date: 2026-03-28 00:00:00.000000
"""

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'mention'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; no-op
    pass
