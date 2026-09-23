"""The signed-in user's own notification preferences."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..config import settings
from ..deps import get_app_db
from ..i18n import ApiError
from ..models.user_namespace_snapshot import UserNamespaceSnapshot
from ..notifications import preferences as prefs
from ..schemas.notification_preference import (
    NotificationPreferenceItem,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
)
from ..services.audit_service import log_action

router = APIRouter(prefix="/me/notification-preferences", tags=["preferences"])


async def _response(db: AsyncSession, user_id: str) -> NotificationPreferencesResponse:
    items = [
        NotificationPreferenceItem(category=p.category, in_app=p.in_app, email=p.email)
        for p in await prefs.get_preferences(db, user_id)
    ]
    snapshot = await db.get(UserNamespaceSnapshot, user_id)
    cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=settings.team_notification_active_days)
    active = snapshot is not None and snapshot.last_seen_at >= cutoff
    return NotificationPreferencesResponse(items=items, team_notifications_active=active)


@router.get("", response_model=NotificationPreferencesResponse)
async def get_my_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> NotificationPreferencesResponse:
    return await _response(db, current_user.id)


@router.put("", response_model=NotificationPreferencesResponse)
async def update_my_preferences(
    body: NotificationPreferencesUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> NotificationPreferencesResponse:
    unknown = [i.category for i in body.items if i.category not in prefs.CATEGORIES]
    if unknown:
        raise ApiError(400, "notification_category_unknown", category=", ".join(unknown))
    await prefs.set_preferences(
        db,
        current_user.id,
        [prefs.EffectivePreference(category=i.category, in_app=i.in_app, email=i.email) for i in body.items],
    )
    await log_action(
        db,
        current_user.id,
        "notification_preferences_updated",
        "user",
        current_user.id,
        {"categories": sorted(i.category for i in body.items)},
    )
    await db.commit()
    return await _response(db, current_user.id)
