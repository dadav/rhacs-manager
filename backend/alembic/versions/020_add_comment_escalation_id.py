"""Add escalation_id foreign key to cve_comments

Revision ID: 020
Revises: 019
Create Date: 2026-08-14 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cve_comments",
        sa.Column("escalation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_cve_comments_escalation_id",
        "cve_comments",
        ["escalation_id"],
    )
    op.create_foreign_key(
        "fk_cve_comments_escalation_id",
        "cve_comments",
        "escalations",
        ["escalation_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_cve_comments_escalation_id", "cve_comments", type_="foreignkey")
    op.drop_index("ix_cve_comments_escalation_id", table_name="cve_comments")
    op.drop_column("cve_comments", "escalation_id")
