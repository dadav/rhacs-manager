"""Add suppression rules for false positive CVE management

Revision ID: 010
Revises: 009
Create Date: 2026-03-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "suppression_rules",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "status",
            sa.Enum(
                "requested",
                "approved",
                "rejected",
                name="suppressionstatus",
            ),
            nullable=False,
            server_default="requested",
            index=True,
        ),
        sa.Column(
            "type",
            sa.Enum("component", "cve", name="suppressiontype"),
            nullable=False,
            index=True,
        ),
        sa.Column("component_name", sa.String(512), nullable=True, index=True),
        sa.Column("version_pattern", sa.String(255), nullable=True),
        sa.Column("cve_id", sa.String(50), nullable=True, index=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("reference_url", sa.String(2048), nullable=True),
        sa.Column("review_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column(
            "created_by",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=False,
        ),
        sa.Column(
            "reviewed_by",
            sa.String(255),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
    )

    # Unique active component rule per (component_name, version_pattern)
    op.create_index(
        "uq_suppression_rules_active_component",
        "suppression_rules",
        ["component_name", "version_pattern"],
        unique=True,
        postgresql_where=sa.text(
            "type = 'component' AND status IN ('requested', 'approved')"
        ),
    )

    # Unique active CVE rule per cve_id
    op.create_index(
        "uq_suppression_rules_active_cve",
        "suppression_rules",
        ["cve_id"],
        unique=True,
        postgresql_where=sa.text(
            "type = 'cve' AND status IN ('requested', 'approved')"
        ),
    )


def downgrade() -> None:
    op.drop_table("suppression_rules")
    op.execute("DROP TYPE IF EXISTS suppressionstatus")
    op.execute("DROP TYPE IF EXISTS suppressiontype")
