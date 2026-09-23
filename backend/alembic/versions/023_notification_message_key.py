"""Add notifications.message_key and notifications.params for localized rendering

New notifications store a message key plus primitive params and are rendered in
the request language on read. Existing rows keep their stored German
title/message (both new columns stay NULL).

Revision ID: 023
Revises: 022
Create Date: 2026-09-23 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("message_key", sa.String(length=64), nullable=True))
    op.add_column("notifications", sa.Column("params", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "params")
    op.drop_column("notifications", "message_key")
