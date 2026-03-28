"""Add updated_at column to cve_comments

Revision ID: 016
Revises: 015
Create Date: 2026-03-28 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cve_comments",
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cve_comments", "updated_at")
