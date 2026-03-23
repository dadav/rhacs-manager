"""Scope key for scoped risk acceptances

Revision ID: 003
Revises: 002
Create Date: 2026-02-27 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("risk_acceptances", sa.Column("scope_key", sa.String(length=32), nullable=True))

    op.execute(
        """
        UPDATE risk_acceptances
        SET scope = '{"mode":"all","targets":[]}'::jsonb
        WHERE scope IS NULL OR scope = '{}'::jsonb
        """
    )
    op.execute(
        """
        UPDATE risk_acceptances
        SET scope_key = md5(COALESCE(scope::text, '{"mode":"all","targets":[]}'::text))
        WHERE scope_key IS NULL
        """
    )

    op.alter_column("risk_acceptances", "scope_key", nullable=False)
    op.create_index("ix_risk_acceptances_scope_key", "risk_acceptances", ["scope_key"], unique=False)
    op.create_index(
        "uq_risk_acceptances_active_scope",
        "risk_acceptances",
        ["team_id", "cve_id", "scope_key"],
        unique=True,
        postgresql_where=sa.text("status IN ('requested', 'approved')"),
    )


def downgrade() -> None:
    op.drop_index("uq_risk_acceptances_active_scope", table_name="risk_acceptances")
    op.drop_index("ix_risk_acceptances_scope_key", table_name="risk_acceptances")
    op.drop_column("risk_acceptances", "scope_key")
