"""Team notifications: namespace snapshots, notification preferences, CVE alert marks

- ``user_namespace_snapshots``: last namespaces seen per user at sign-in, used
  only to target background notifications (never for access control).
- ``notification_preferences``: per-user overrides of category defaults.
- ``cve_alert_marks``: (CVE, namespace, reason) pairs already alerted, so the
  daily team-alert job only notifies about new ones.

Revision ID: 024
Revises: 023
Create Date: 2026-09-23 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_namespace_snapshots",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("namespaces", postgresql.JSONB(), nullable=False),
        sa.Column("has_all_namespaces", sa.Boolean(), nullable=False),
        sa.Column("namespaces_hash", sa.String(length=64), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_user_namespace_snapshots_last_seen_at", "user_namespace_snapshots", ["last_seen_at"])
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category", sa.String(length=64), primary_key=True),
        sa.Column("in_app", sa.Boolean(), nullable=False),
        sa.Column("email", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "cve_alert_marks",
        sa.Column("cve_id", sa.String(length=64), primary_key=True),
        sa.Column("namespace", sa.String(length=255), primary_key=True),
        sa.Column("cluster_name", sa.String(length=255), primary_key=True),
        sa.Column("reason", sa.String(length=32), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cve_alert_marks")
    op.drop_table("notification_preferences")
    op.drop_index("ix_user_namespace_snapshots_last_seen_at", table_name="user_namespace_snapshots")
    op.drop_table("user_namespace_snapshots")
