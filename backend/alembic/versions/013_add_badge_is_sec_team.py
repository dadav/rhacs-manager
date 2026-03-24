"""Add is_sec_team to badge_tokens

Revision ID: 013
Revises: 012
Create Date: 2026-03-24 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "badge_tokens",
        sa.Column("is_sec_team", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("badge_tokens", "is_sec_team")
