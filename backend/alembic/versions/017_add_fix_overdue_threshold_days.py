"""Add fix_overdue_threshold_days to global_settings

Revision ID: 017
Revises: 016
Create Date: 2026-05-08 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "global_settings",
        sa.Column(
            "fix_overdue_threshold_days",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),
    )


def downgrade() -> None:
    op.drop_column("global_settings", "fix_overdue_threshold_days")
