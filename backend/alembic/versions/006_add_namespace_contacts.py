"""Add namespace_contacts table for escalation emails

Revision ID: 006
Revises: 005
Create Date: 2026-03-02 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "namespace_contacts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("namespace", sa.String(255), nullable=False, index=True),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.Column("escalation_email", sa.String(255), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("namespace", "cluster_name", name="uq_namespace_contact_ns_cluster"),
    )


def downgrade() -> None:
    op.drop_table("namespace_contacts")
