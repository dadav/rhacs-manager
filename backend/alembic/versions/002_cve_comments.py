"""CVE comments table

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cve_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False, index=True),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cve_comments")
