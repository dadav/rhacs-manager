"""Add cve_snapshots table for dashboard history chart

Revision ID: 019
Revises: 018
Create Date: 2026-07-04 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cve_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("count_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("count_visible", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("snapshot_date", "cluster_name", "namespace", "severity", name="uq_cve_snapshot"),
    )
    op.create_index("ix_cve_snapshots_snapshot_date", "cve_snapshots", ["snapshot_date"])


def downgrade() -> None:
    op.drop_index("ix_cve_snapshots_snapshot_date", table_name="cve_snapshots")
    op.drop_table("cve_snapshots")
