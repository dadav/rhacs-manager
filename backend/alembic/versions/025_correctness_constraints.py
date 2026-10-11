"""Correctness constraints: RESTRICT user FKs, unique escalations

- Six NOT NULL user foreign keys were declared ``ON DELETE SET NULL``, which
  PostgreSQL can never honour (it fails with a NOT NULL violation). They become
  ``ON DELETE RESTRICT`` so deleting a user who authored records fails explicitly
  and authorship stays intact.
- ``escalations`` gets a unique constraint on (cve_id, level, namespace,
  cluster_name). Existing duplicates are merged first: the earliest row
  (triggered_at, then id) is kept, its ``notified`` becomes the OR of the group,
  and comments linked to a dropped duplicate are repointed to the kept row.

Downgrade restores the schema only. Deleted duplicate escalations and the
original comment-to-duplicate links cannot be restored.

Revision ID: 025
Revises: 024
Create Date: 2026-10-11 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None

# (table, column) pairs that are NOT NULL and reference users.id.
_NOT_NULL_USER_FKS = [
    ("risk_acceptances", "created_by"),
    ("risk_acceptance_comments", "user_id"),
    ("cve_priorities", "set_by"),
    ("cve_comments", "user_id"),
    ("badge_tokens", "created_by"),
    ("suppression_rules", "created_by"),
]

_ESCALATION_UNIQUE = "uq_escalations_cve_level_ns_cluster"


def _user_fk_name(table: str, column: str) -> str:
    inspector = sa.inspect(op.get_bind())
    for fk in inspector.get_foreign_keys(table):
        if fk["referred_table"] == "users" and fk["constrained_columns"] == [column]:
            return fk["name"]
    raise RuntimeError(f"No users foreign key found on {table}.{column}")


def _set_user_fk_ondelete(ondelete: str) -> None:
    for table, column in _NOT_NULL_USER_FKS:
        name = _user_fk_name(table, column)
        op.drop_constraint(name, table, type_="foreignkey")
        op.create_foreign_key(name, table, "users", [column], ["id"], ondelete=ondelete)


def _merge_duplicate_escalations() -> None:
    bind = op.get_bind()
    op.execute(
        """
        CREATE TEMP TABLE escalation_dedup ON COMMIT DROP AS
        SELECT
            id,
            FIRST_VALUE(id) OVER w AS keep_id,
            BOOL_OR(notified) OVER (PARTITION BY cve_id, level, namespace, cluster_name) AS any_notified
        FROM escalations
        WINDOW w AS (
            PARTITION BY cve_id, level, namespace, cluster_name
            ORDER BY triggered_at ASC, id ASC
        )
        """
    )
    op.execute(
        """
        UPDATE escalations e
        SET notified = d.any_notified
        FROM escalation_dedup d
        WHERE e.id = d.id AND d.id = d.keep_id AND e.notified IS DISTINCT FROM d.any_notified
        """
    )
    op.execute(
        """
        UPDATE cve_comments c
        SET escalation_id = d.keep_id
        FROM escalation_dedup d
        WHERE c.escalation_id = d.id AND d.id <> d.keep_id
        """
    )
    deleted = bind.execute(
        sa.text(
            """
            DELETE FROM escalations e
            USING escalation_dedup d
            WHERE e.id = d.id AND d.id <> d.keep_id
            """
        )
    ).rowcount
    print(f"migration 025: removed {deleted} duplicate escalation rows")
    op.execute("DROP TABLE escalation_dedup")


def upgrade() -> None:
    _set_user_fk_ondelete("RESTRICT")
    _merge_duplicate_escalations()
    op.create_unique_constraint(_ESCALATION_UNIQUE, "escalations", ["cve_id", "level", "namespace", "cluster_name"])


def downgrade() -> None:
    op.drop_constraint(_ESCALATION_UNIQUE, "escalations", type_="unique")
    _set_user_fk_ondelete("SET NULL")
