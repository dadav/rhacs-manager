"""Add assigned_to column to risk_acceptances

Revision ID: 015
Revises: 014
Create Date: 2026-03-28 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "risk_acceptances",
        sa.Column("assigned_to", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("risk_acceptances", "assigned_to")
