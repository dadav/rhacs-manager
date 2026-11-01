"""CVE subscriptions

``cve_subscriptions`` holds one row per (user, CVE) the user follows, with the
pair-keyed StackRox state the hourly diff job compares against.
``cve_subscription_events`` logs every subscription event per recipient (feeds
the opt-in daily summary email independent of the in-app preference).
``cve_subscription_email_deliveries`` caps that email at one per user per UTC day.

Revision ID: 027
Revises: 026
Create Date: 2026-11-01 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'cve_subscription'")

    op.create_table(
        "cve_subscriptions",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("cve_id", sa.String(length=64), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("state", postgresql.JSONB(), nullable=False),
        sa.Column("state_checked_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_cve_subscriptions_cve_id", "cve_subscriptions", ["cve_id"])

    op.create_table(
        "cve_subscription_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cve_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("scope", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_cve_subscription_events_user_created",
        "cve_subscription_events",
        ["user_id", "created_at"],
    )

    op.create_table(
        "cve_subscription_email_deliveries",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sent_on", sa.Date(), primary_key=True),
        sa.Column("sent_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cve_subscription_email_deliveries")
    op.drop_index("ix_cve_subscription_events_user_created", table_name="cve_subscription_events")
    op.drop_table("cve_subscription_events")
    op.drop_index("ix_cve_subscriptions_cve_id", table_name="cve_subscriptions")
    op.drop_table("cve_subscriptions")
    # PostgreSQL does not support removing enum values; 'cve_subscription' stays.
