"""Add organization-wide CVE aliases.

Revision ID: 033
Revises: 032
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cve_aliases",
        sa.Column("cve_id", sa.String(64), primary_key=True),
        sa.Column("aliases", postgresql.JSONB().with_variant(sa.JSON(), "sqlite"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cve_aliases")
