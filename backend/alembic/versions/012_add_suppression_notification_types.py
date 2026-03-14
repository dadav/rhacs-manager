"""Add notification types for suppression rule status changes

Revision ID: 012
Revises: 011
Create Date: 2026-03-14 00:00:00.000000
"""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None

NEW_VALUES = ["suppression_requested", "suppression_approved", "suppression_rejected"]


def upgrade() -> None:
    for value in NEW_VALUES:
        op.execute(f"ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; no-op
    pass
