"""Notification summary email

``notification_email_events`` holds one row per notification waiting to be counted
in a user's opt-in daily summary email (message key only, no params).
``notification_summary_deliveries`` caps that email at one per user per UTC day.

Revision ID: 028
Revises: 027
Create Date: 2026-11-05 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_email_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=255),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_notification_email_events_user_created",
        "notification_email_events",
        ["user_id", "created_at"],
    )
    op.create_table(
        "notification_summary_deliveries",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sent_on", sa.Date(), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notification_summary_deliveries")
    op.drop_index("ix_notification_email_events_user_created", table_name="notification_email_events")
    op.drop_table("notification_email_events")
