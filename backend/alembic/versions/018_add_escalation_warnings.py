"""Add escalation_warnings dedup table

Revision ID: 018
Revises: 017
Create Date: 2026-06-22 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "escalation_warnings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=False),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_escalation_warnings_cve_id", "escalation_warnings", ["cve_id"])
    op.create_index("ix_escalation_warnings_namespace", "escalation_warnings", ["namespace"])


def downgrade() -> None:
    op.drop_index("ix_escalation_warnings_namespace", table_name="escalation_warnings")
    op.drop_index("ix_escalation_warnings_cve_id", table_name="escalation_warnings")
    op.drop_table("escalation_warnings")
