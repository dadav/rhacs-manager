"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "team_namespaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=False),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.UniqueConstraint("team_id", "namespace", "cluster_name", name="uq_team_namespace_cluster"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("team_member", "sec_team", name="userrole"), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "risk_acceptances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False, index=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("requested", "approved", "rejected", "expired", name="riskstatus"), nullable=False),
        sa.Column("justification", sa.Text(), nullable=False),
        sa.Column("scope", postgresql.JSONB(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("reviewed_by", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "risk_acceptance_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("risk_acceptance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("risk_acceptances.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "cve_priorities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False, unique=True),
        sa.Column("priority", sa.Enum("critical", "high", "medium", "low", name="prioritylevel"), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("set_by", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("deadline", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "global_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("min_cvss_score", sa.Numeric(4, 1), nullable=False, server_default="0"),
        sa.Column("min_epss_score", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("escalation_rules", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("digest_day", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("management_email", sa.String(255), nullable=False, server_default="''"),
        sa.Column("updated_by", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "escalations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cve_id", sa.String(50), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(), nullable=False),
        sa.Column("notified", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "badge_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=True),
        sa.Column("cluster_name", sa.String(255), nullable=True),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("label", sa.String(255), nullable=False, server_default="'CVEs'"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum(
            "risk_comment", "risk_approved", "risk_rejected", "risk_expiring",
            "new_priority", "escalation", "new_critical_cve",
            name="notificationtype"
        ), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link", sa.String(512), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, index=True),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=True),
        sa.Column("details", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, index=True),
    )


def downgrade() -> None:
    for table in [
        "audit_log", "notifications", "badge_tokens", "escalations",
        "global_settings", "cve_priorities", "risk_acceptance_comments",
        "risk_acceptances", "users", "team_namespaces", "teams",
    ]:
        op.drop_table(table)

    for enum in ["userrole", "riskstatus", "prioritylevel", "notificationtype"]:
        op.execute(f"DROP TYPE IF EXISTS {enum}")
