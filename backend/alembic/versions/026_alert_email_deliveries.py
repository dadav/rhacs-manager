"""Alert summary email deliveries

``alert_email_deliveries`` holds one row per (user, UTC day) on which the
opt-in CVE alert summary email was sent. Its primary key caps the email at one
per user per day.

Revision ID: 026
Revises: 025
Create Date: 2026-10-31 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "alert_email_deliveries",
        sa.Column("user_id", sa.String(length=255), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("sent_on", sa.Date(), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("alert_email_deliveries")
