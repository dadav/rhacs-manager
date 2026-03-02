"""Add escalation_warning_days to global_settings

Revision ID: 005
Revises: 004
Create Date: 2026-03-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "global_settings",
        sa.Column("escalation_warning_days", sa.Integer(), nullable=False, server_default="3"),
    )


def downgrade() -> None:
    op.drop_column("global_settings", "escalation_warning_days")
