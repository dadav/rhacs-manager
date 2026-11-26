"""Add ACS activity console tables and the collector singleton.

Revision ID: 034
Revises: 033
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None

_JSON = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "activity_events",
        # BIGSERIAL on PostgreSQL: a bigint sequence the collector never resets.
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("observed_at", sa.DateTime(), nullable=False),
        sa.Column("source_at", sa.DateTime(), nullable=True),
        sa.Column("cluster_name", sa.String(253), nullable=False),
        sa.Column("namespace", sa.String(253), nullable=False),
        sa.Column("details", _JSON, nullable=False),
        sqlite_autoincrement=True,
    )
    op.create_index("ix_activity_events_pair_id", "activity_events", ["cluster_name", "namespace", "id"])
    op.create_index("ix_activity_events_observed_at", "activity_events", ["observed_at"])

    op.create_table(
        "activity_snapshots",
        sa.Column("entity_type", sa.String(16), primary_key=True),
        sa.Column("entity_id", sa.String(255), primary_key=True),
        sa.Column("snapshot", _JSON, nullable=False),
    )

    collector_state = op.create_table(
        "activity_collector_state",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("snapshot_version", sa.Integer(), nullable=False),
        sa.Column("initialized_at", sa.DateTime(), nullable=True),
        sa.Column("last_success_at", sa.DateTime(), nullable=True),
        sa.Column("last_event_id", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.bulk_insert(
        collector_state,
        [{"id": 1, "snapshot_version": 1, "initialized_at": None, "last_success_at": None, "last_event_id": 0}],
    )


def downgrade() -> None:
    op.drop_table("activity_collector_state")
    op.drop_table("activity_snapshots")
    op.drop_index("ix_activity_events_observed_at", table_name="activity_events")
    op.drop_index("ix_activity_events_pair_id", table_name="activity_events")
    op.drop_table("activity_events")
