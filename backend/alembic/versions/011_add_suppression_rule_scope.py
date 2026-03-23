"""Add scope to CVE-type suppression rules

Revision ID: 011
Revises: 010
Create Date: 2026-03-14 00:00:00.000000
"""

import hashlib
import json

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

# The default scope for existing CVE-type rules: global
_DEFAULT_SCOPE = {"mode": "all", "targets": []}
_DEFAULT_SCOPE_KEY = hashlib.md5(
    json.dumps(_DEFAULT_SCOPE, sort_keys=True, separators=(",", ":")).encode("utf-8")
).hexdigest()


def upgrade() -> None:
    # Add scope and scope_key columns with defaults for backfill
    op.add_column(
        "suppression_rules",
        sa.Column(
            "scope",
            JSONB(),
            nullable=False,
            server_default=sa.text(f"'{json.dumps(_DEFAULT_SCOPE)}'::jsonb"),
        ),
    )
    op.add_column(
        "suppression_rules",
        sa.Column(
            "scope_key",
            sa.String(32),
            nullable=False,
            server_default=sa.text(f"'{_DEFAULT_SCOPE_KEY}'"),
        ),
    )

    op.create_index("ix_suppression_rules_scope_key", "suppression_rules", ["scope_key"])

    # Drop old unique CVE index and create new one that includes scope_key
    op.drop_index("uq_suppression_rules_active_cve", table_name="suppression_rules")
    op.create_index(
        "uq_suppression_rules_active_cve_scope",
        "suppression_rules",
        ["cve_id", "scope_key"],
        unique=True,
        postgresql_where=sa.text("type = 'cve' AND status IN ('requested', 'approved')"),
    )

    # Remove server defaults now that backfill is done
    op.alter_column("suppression_rules", "scope", server_default=None)
    op.alter_column("suppression_rules", "scope_key", server_default=None)


def downgrade() -> None:
    op.drop_index("uq_suppression_rules_active_cve_scope", table_name="suppression_rules")
    op.drop_index("ix_suppression_rules_scope_key", table_name="suppression_rules")

    op.create_index(
        "uq_suppression_rules_active_cve",
        "suppression_rules",
        ["cve_id"],
        unique=True,
        postgresql_where=sa.text("type = 'cve' AND status IN ('requested', 'approved')"),
    )

    op.drop_column("suppression_rules", "scope_key")
    op.drop_column("suppression_rules", "scope")
