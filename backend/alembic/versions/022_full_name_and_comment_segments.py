"""Add users.full_name, comment content_segments, and migrate audit detail user keys

Adds the mutable, non-unique ``users.full_name`` (display name source) and the
nullable JSONB ``content_segments`` columns on both comment tables. Existing
``@[username]`` messages are backfilled into structured segments using
case-insensitive username resolution, without rewriting the historical
``message`` text. Unknown tokens remain ordinary text.

Also migrates username-bearing audit-log detail keys to stable user ids where
resolvable (``assigned_to`` -> ``assigned_to_id``, ``triggered_by`` ->
``triggered_by_id``).

Revision ID: 022
Revises: 021
Create Date: 2026-08-17 00:00:00.000000
"""

import json
import re

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None

_MENTION_RE = re.compile(r"@\[([^\]]+)\]")


def _build_segments(message: str, name_to_user: dict[str, tuple[str, str]]) -> list[dict]:
    """Parse a legacy ``@[username]`` message into ordered text/mention segments.

    Self-contained copy of the runtime helper so the migration never depends on
    app code that may change after this revision lands.
    """
    segments: list[dict] = []
    pos = 0

    def _append_text(text: str) -> None:
        if not text:
            return
        if segments and segments[-1]["type"] == "text":
            segments[-1]["text"] += text
        else:
            segments.append({"type": "text", "text": text})

    for match in _MENTION_RE.finditer(message):
        _append_text(message[pos : match.start()])
        resolved = name_to_user.get(match.group(1).lower())
        if resolved is not None:
            user_id, canonical = resolved
            segments.append({"type": "mention", "user_id": user_id, "username": canonical})
        else:
            _append_text(match.group(0))
        pos = match.end()

    _append_text(message[pos:])
    return segments


def _backfill_comments(bind, name_to_user: dict[str, tuple[str, str]], table: str) -> None:
    rows = bind.execute(sa.text(f"SELECT id, message FROM {table}")).fetchall()
    for row in rows:
        segments = _build_segments(row.message or "", name_to_user)
        bind.execute(
            sa.text(f"UPDATE {table} SET content_segments = CAST(:seg AS JSONB) WHERE id = :id"),
            {"seg": json.dumps(segments), "id": row.id},
        )


def _migrate_audit_detail_key(bind, user_by_lower: dict[str, str], old_key: str, new_key: str) -> None:
    """Rewrite audit detail values stored under ``old_key`` (a username) to the
    stable user id under ``new_key`` where the username resolves."""
    rows = bind.execute(
        sa.text("SELECT id, details FROM audit_log WHERE jsonb_exists(details, :k)"),
        {"k": old_key},
    ).fetchall()
    for row in rows:
        details = dict(row.details or {})
        raw = details.pop(old_key, None)
        if isinstance(raw, str) and raw.lower() in user_by_lower:
            details[new_key] = user_by_lower[raw.lower()]
        elif raw is not None:
            # Unresolvable: keep the original username value under the old key.
            details[old_key] = raw
        bind.execute(
            sa.text("UPDATE audit_log SET details = CAST(:d AS JSONB) WHERE id = :id"),
            {"d": json.dumps(details), "id": row.id},
        )


def _restore_audit_detail_key(bind, username_by_id: dict[str, str], new_key: str, old_key: str) -> None:
    """Restore a stable-id detail key to the legacy username-key shape."""
    rows = bind.execute(
        sa.text("SELECT id, details FROM audit_log WHERE jsonb_exists(details, :k)"),
        {"k": new_key},
    ).fetchall()
    for row in rows:
        details = dict(row.details or {})
        user_id = details.pop(new_key, None)
        if isinstance(user_id, str):
            details[old_key] = username_by_id.get(user_id, user_id)
        bind.execute(
            sa.text("UPDATE audit_log SET details = CAST(:d AS JSONB) WHERE id = :id"),
            {"d": json.dumps(details), "id": row.id},
        )


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))
    op.add_column("cve_comments", sa.Column("content_segments", postgresql.JSONB(), nullable=True))
    op.add_column(
        "risk_acceptance_comments",
        sa.Column("content_segments", postgresql.JSONB(), nullable=True),
    )

    bind = op.get_bind()
    users = bind.execute(sa.text("SELECT id, username FROM users")).fetchall()
    name_to_user = {u.username.lower(): (u.id, u.username) for u in users}
    user_by_lower = {u.username.lower(): u.id for u in users}

    _backfill_comments(bind, name_to_user, "cve_comments")
    _backfill_comments(bind, name_to_user, "risk_acceptance_comments")

    _migrate_audit_detail_key(bind, user_by_lower, "assigned_to", "assigned_to_id")
    _migrate_audit_detail_key(bind, user_by_lower, "triggered_by", "triggered_by_id")


def downgrade() -> None:
    bind = op.get_bind()
    users = bind.execute(sa.text("SELECT id, username FROM users")).fetchall()
    username_by_id = {user.id: user.username for user in users}
    _restore_audit_detail_key(bind, username_by_id, "assigned_to_id", "assigned_to")
    _restore_audit_detail_key(bind, username_by_id, "triggered_by_id", "triggered_by")

    op.drop_column("risk_acceptance_comments", "content_segments")
    op.drop_column("cve_comments", "content_segments")
    op.drop_column("users", "full_name")
