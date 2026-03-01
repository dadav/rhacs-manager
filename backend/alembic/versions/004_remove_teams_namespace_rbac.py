"""Remove teams, use K8s RBAC-derived namespace access

Revision ID: 004
Revises: 003
Create Date: 2026-03-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop the old unique index on risk_acceptances that includes team_id
    op.drop_index("uq_risk_acceptances_active_scope", table_name="risk_acceptances")

    # 2. Drop team_id FK from risk_acceptances
    op.drop_constraint("risk_acceptances_team_id_fkey", "risk_acceptances", type_="foreignkey")
    op.drop_index("ix_risk_acceptances_team_id", table_name="risk_acceptances", if_exists=True)
    op.drop_column("risk_acceptances", "team_id")

    # 3. Create new unique index on risk_acceptances without team_id
    op.create_index(
        "uq_risk_acceptances_active_scope",
        "risk_acceptances",
        ["cve_id", "scope_key"],
        unique=True,
        postgresql_where=sa.text("status IN ('requested', 'approved')"),
    )

    # 4. Drop team_id FK from users
    op.drop_constraint("users_team_id_fkey", "users", type_="foreignkey")
    op.drop_column("users", "team_id")

    # 5. Update escalations: drop team_id, add namespace + cluster_name
    op.drop_constraint("escalations_team_id_fkey", "escalations", type_="foreignkey")
    op.drop_index("ix_escalations_team_id", table_name="escalations", if_exists=True)
    op.drop_column("escalations", "team_id")
    op.add_column("escalations", sa.Column("namespace", sa.String(255), nullable=True))
    op.add_column("escalations", sa.Column("cluster_name", sa.String(255), nullable=True))
    # Set defaults for existing rows
    op.execute("UPDATE escalations SET namespace = 'unknown', cluster_name = 'unknown' WHERE namespace IS NULL")
    op.alter_column("escalations", "namespace", nullable=False)
    op.alter_column("escalations", "cluster_name", nullable=False)
    op.create_index("ix_escalations_namespace", "escalations", ["namespace"])

    # 6. Update badge_tokens: drop team_id, add created_by
    op.drop_constraint("badge_tokens_team_id_fkey", "badge_tokens", type_="foreignkey")
    op.drop_index("ix_badge_tokens_team_id", table_name="badge_tokens", if_exists=True)
    op.drop_column("badge_tokens", "team_id")
    op.add_column("badge_tokens", sa.Column("created_by", sa.String(255), nullable=True))
    # Ensure a 'system' user exists for FK reference
    op.execute(
        "INSERT INTO users (id, username, email, role, created_at) "
        "VALUES ('system', 'system', 'system@localhost', 'sec_team', NOW()) "
        "ON CONFLICT (id) DO NOTHING"
    )
    # Set defaults for existing rows
    op.execute("UPDATE badge_tokens SET created_by = 'system' WHERE created_by IS NULL")
    op.alter_column("badge_tokens", "created_by", nullable=False)
    op.create_foreign_key(
        "badge_tokens_created_by_fkey", "badge_tokens", "users",
        ["created_by"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_badge_tokens_created_by", "badge_tokens", ["created_by"])

    # 7. Drop team_namespaces table
    op.drop_table("team_namespaces")

    # 8. Drop teams table
    op.drop_table("teams")


def downgrade() -> None:
    # Recreate teams table
    op.create_table(
        "teams",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    # Recreate team_namespaces table
    op.create_table(
        "team_namespaces",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("team_id", sa.Uuid(), sa.ForeignKey("teams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("namespace", sa.String(255), nullable=False),
        sa.Column("cluster_name", sa.String(255), nullable=False),
        sa.UniqueConstraint("team_id", "namespace", "cluster_name", name="uq_team_namespace_cluster"),
    )

    # Restore badge_tokens
    op.drop_index("ix_badge_tokens_created_by", table_name="badge_tokens")
    op.drop_constraint("badge_tokens_created_by_fkey", "badge_tokens", type_="foreignkey")
    op.drop_column("badge_tokens", "created_by")
    op.add_column("badge_tokens", sa.Column("team_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "badge_tokens_team_id_fkey", "badge_tokens", "teams",
        ["team_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_badge_tokens_team_id", "badge_tokens", ["team_id"])

    # Restore escalations
    op.drop_index("ix_escalations_namespace", table_name="escalations")
    op.drop_column("escalations", "cluster_name")
    op.drop_column("escalations", "namespace")
    op.add_column("escalations", sa.Column("team_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "escalations_team_id_fkey", "escalations", "teams",
        ["team_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_escalations_team_id", "escalations", ["team_id"])

    # Restore users
    op.add_column("users", sa.Column("team_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "users_team_id_fkey", "users", "teams",
        ["team_id"], ["id"], ondelete="SET NULL",
    )

    # Restore risk_acceptances
    op.drop_index("uq_risk_acceptances_active_scope", table_name="risk_acceptances")
    op.add_column("risk_acceptances", sa.Column("team_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "risk_acceptances_team_id_fkey", "risk_acceptances", "teams",
        ["team_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_risk_acceptances_team_id", "risk_acceptances", ["team_id"])
    op.create_index(
        "uq_risk_acceptances_active_scope",
        "risk_acceptances",
        ["team_id", "cve_id", "scope_key"],
        unique=True,
        postgresql_where=sa.text("status IN ('requested', 'approved')"),
    )
