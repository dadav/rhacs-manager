"""Add case-insensitive unique index on users.username

Enforces the invariant that usernames are globally unique regardless of case,
so @[username] mentions resolve to exactly one account. The upgrade refuses to
run if case-insensitive duplicates already exist: it aborts with an explicit
error listing the conflicts rather than silently merging or dropping accounts.

Revision ID: 021
Revises: 020
Create Date: 2026-08-14 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None

_INDEX_NAME = "uq_users_username_lower"


def upgrade() -> None:
    bind = op.get_bind()
    duplicates = bind.execute(
        sa.text(
            "SELECT lower(username) AS uname, count(*) AS n FROM users GROUP BY lower(username) HAVING count(*) > 1"
        )
    ).fetchall()
    if duplicates:
        conflicts = ", ".join(f"{row.uname!r} (x{row.n})" for row in duplicates)
        raise RuntimeError(
            "Cannot create unique index on lower(username): case-insensitive "
            "duplicate usernames exist and must be resolved manually before "
            f"applying this migration: {conflicts}"
        )
    op.create_index(_INDEX_NAME, "users", [sa.text("lower(username)")], unique=True)


def downgrade() -> None:
    op.drop_index(_INDEX_NAME, table_name="users")
