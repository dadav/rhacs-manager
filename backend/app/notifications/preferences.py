"""Notification categories, their defaults, and per-user preference lookup.

Users choose per category whether they get in-app notifications and emails.
``CATEGORIES`` is the single source of truth: which notification types belong to a
category, which channels exist for it, and the defaults when the user has no
stored preference. Mentions are mandatory (in-app and email) and are not listed.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import NotificationType
from ..models.notification_preference import NotificationPreference


@dataclass(frozen=True)
class Category:
    types: tuple[NotificationType, ...]
    # None = channel does not exist for this category (not configurable).
    in_app_default: bool | None
    email_default: bool | None


CATEGORIES: dict[str, Category] = {
    "risk_acceptance": Category(
        types=(
            NotificationType.risk_comment,
            NotificationType.risk_approved,
            NotificationType.risk_rejected,
            NotificationType.risk_expiring,
        ),
        in_app_default=True,
        email_default=True,
    ),
    "remediation": Category(
        types=(
            NotificationType.remediation_created,
            NotificationType.remediation_status,
            NotificationType.remediation_overdue,
        ),
        in_app_default=True,
        email_default=None,
    ),
    "suppression": Category(
        types=(
            NotificationType.suppression_requested,
            NotificationType.suppression_approved,
            NotificationType.suppression_rejected,
        ),
        in_app_default=True,
        email_default=None,
    ),
    "priority": Category(types=(NotificationType.new_priority,), in_app_default=True, email_default=None),
    "new_critical_cve": Category(types=(NotificationType.new_critical_cve,), in_app_default=True, email_default=None),
    "escalation": Category(types=(NotificationType.escalation,), in_app_default=True, email_default=None),
    # Weekly team digest: email only, opt-in.
    "team_digest": Category(types=(), in_app_default=None, email_default=False),
}

_CATEGORY_BY_TYPE: dict[NotificationType, str] = {t: name for name, cat in CATEGORIES.items() for t in cat.types}


def category_for_type(ntype: NotificationType) -> str | None:
    """Category of a notification type; None for mandatory types (mentions)."""
    return _CATEGORY_BY_TYPE.get(ntype)


@dataclass(frozen=True)
class EffectivePreference:
    category: str
    in_app: bool | None
    email: bool | None


def _effective(category: str, stored: NotificationPreference | None) -> EffectivePreference:
    cat = CATEGORIES[category]
    in_app = cat.in_app_default
    email = cat.email_default
    if stored is not None:
        if in_app is not None:
            in_app = stored.in_app
        if email is not None:
            email = stored.email
    return EffectivePreference(category=category, in_app=in_app, email=email)


async def get_preferences(session: AsyncSession, user_id: str) -> list[EffectivePreference]:
    """All categories with the user's effective settings, in catalog order."""
    result = await session.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    stored = {p.category: p for p in result.scalars().all()}
    return [_effective(name, stored.get(name)) for name in CATEGORIES]


async def wants(session: AsyncSession, user_id: str, category: str, channel: str) -> bool:
    """Whether ``user_id`` wants ``channel`` ("in_app" or "email") for ``category``.

    Unconfigurable channels (None) count as not wanted for that channel.
    """
    stored = await session.get(NotificationPreference, (user_id, category))
    value = getattr(_effective(category, stored), channel)
    return bool(value)


async def set_preferences(session: AsyncSession, user_id: str, updates: list[EffectivePreference]) -> None:
    """Store updates. Unknown categories raise KeyError; unsupported channels keep their default."""
    for update in updates:
        cat = CATEGORIES[update.category]
        stored = await session.get(NotificationPreference, (user_id, update.category))
        current = _effective(update.category, stored)
        in_app = update.in_app if cat.in_app_default is not None and update.in_app is not None else current.in_app
        email = update.email if cat.email_default is not None and update.email is not None else current.email
        if stored is None:
            stored = NotificationPreference(user_id=user_id, category=update.category)
            session.add(stored)
        stored.in_app = bool(in_app)
        stored.email = bool(email)
