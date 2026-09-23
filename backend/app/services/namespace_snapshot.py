"""Persisted namespace snapshots for notification targeting (roadmap option 3.1a).

Namespace visibility is request-scoped: it arrives with every request and is never
used from storage for access control. Background jobs (team digest, team CVE
alerts) still need to know whom to notify, so each sign-in records the user's
current namespaces here.

Rules:
- Never authorize anything from a snapshot. Jobs only use it to pick recipients.
- A snapshot older than ``settings.team_notification_active_days`` is stale and
  ignored (the user may have lost access or left).
- In-app notifications built from a snapshot carry their namespace scope and are
  re-checked against the reader's live namespaces on read (routers/notifications.py).
"""

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..models.user_namespace_snapshot import UserNamespaceSnapshot

if TYPE_CHECKING:
    from ..auth.middleware import CurrentUser

logger = logging.getLogger(__name__)

# Refresh last_seen_at at most this often when the namespaces are unchanged, so
# authenticated requests do not each cause a write.
_TOUCH_INTERVAL = timedelta(hours=1)


def namespaces_hash(namespaces: list[tuple[str, str]], has_all_namespaces: bool) -> str:
    canonical = json.dumps({"all": has_all_namespaces, "ns": sorted([list(n) for n in namespaces])})
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def record_namespace_snapshot(
    session: AsyncSession,
    current_user: "CurrentUser",
    now: datetime | None = None,
) -> None:
    """Upsert the user's snapshot. Writes only on change or after _TOUCH_INTERVAL."""
    now = now or datetime.now(UTC).replace(tzinfo=None)
    digest = namespaces_hash(current_user.namespaces, current_user.has_all_namespaces)
    snapshot = await session.get(UserNamespaceSnapshot, current_user.id)
    if snapshot is not None and snapshot.namespaces_hash == digest and now - snapshot.last_seen_at < _TOUCH_INTERVAL:
        return
    if snapshot is None:
        snapshot = UserNamespaceSnapshot(user_id=current_user.id)
        session.add(snapshot)
    changed = snapshot.namespaces_hash != digest
    snapshot.namespaces = [list(n) for n in sorted(current_user.namespaces)]
    snapshot.has_all_namespaces = current_user.has_all_namespaces
    snapshot.namespaces_hash = digest
    snapshot.last_seen_at = now
    await session.commit()
    if changed:
        logger.info(
            "namespace_snapshot_updated",
            extra={
                "user_id": current_user.id,
                "namespaces": len(current_user.namespaces),
                "has_all_namespaces": current_user.has_all_namespaces,
            },
        )


@dataclass(frozen=True)
class ActiveRecipient:
    """A user with a fresh snapshot, as background jobs see them."""

    user: User
    namespaces: tuple[tuple[str, str], ...]
    has_all_namespaces: bool

    def as_current_user(self) -> "CurrentUser":
        """CurrentUser equivalent for reusing request-time visibility logic in jobs."""
        from ..auth.middleware import CurrentUser

        return CurrentUser(
            id=self.user.id,
            username=self.user.username,
            full_name=self.user.full_name,
            email=self.user.email,
            role=self.user.role,
            namespaces=list(self.namespaces),
            onboarding_completed=True,
            has_all_namespaces=self.has_all_namespaces,
        )


async def load_active_recipients(
    session: AsyncSession,
    active_days: int,
    now: datetime | None = None,
) -> list[ActiveRecipient]:
    """Users whose snapshot is at most ``active_days`` old, ordered by user id."""
    now = now or datetime.now(UTC).replace(tzinfo=None)
    cutoff = now - timedelta(days=active_days)
    result = await session.execute(
        select(User, UserNamespaceSnapshot)
        .join(UserNamespaceSnapshot, UserNamespaceSnapshot.user_id == User.id)
        .where(UserNamespaceSnapshot.last_seen_at >= cutoff)
        .order_by(User.id)
    )
    return [
        ActiveRecipient(
            user=user,
            namespaces=tuple((ns, cl) for ns, cl in snapshot.namespaces),
            has_all_namespaces=snapshot.has_all_namespaces,
        )
        for user, snapshot in result.all()
    ]
