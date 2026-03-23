"""Add remediations table for CVE remediation tracking

Revision ID: 009
Revises: 008
Create Date: 2026-03-08 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new notification types to the PostgreSQL enum
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'remediation_created'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'remediation_status'")
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'remediation_overdue'")

    op.create_table(
        "remediations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False, index=True),
        sa.Column("namespace", sa.String(255), nullable=False, index=True),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.Column(
            "status",
            sa.Enum("open", "in_progress", "resolved", "verified", "wont_fix", name="remediationstatus"),
            nullable=False,
            server_default="open",
        ),
        sa.Column("assigned_to", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resolved_by", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("cve_id", "namespace", "cluster_name", name="uq_remediation_cve_ns_cluster"),
    )


def downgrade() -> None:
    op.drop_table("remediations")
    op.execute("DROP TYPE IF EXISTS remediationstatus")
