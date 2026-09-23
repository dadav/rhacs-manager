from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..i18n import ApiError, get_language
from ..models.notification import Notification
from ..notifications.messages import SCOPE_PARAM, namespace_label, render_notification
from ..schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _visible_scope(n: Notification, current_user: CurrentUser) -> list[tuple[str, str]] | None:
    """The part of a notification's namespace scope the reader sees now (None = unscoped)."""
    scope = (n.params or {}).get(SCOPE_PARAM)
    if scope is None:
        return None
    pairs = [(ns, cl) for ns, cl in scope]
    if current_user.can_see_all_namespaces:
        return pairs
    live = set(current_user.namespaces)
    return [p for p in pairs if p in live]


def _to_response(n: Notification, current_user: CurrentUser) -> NotificationResponse:
    """Render title/message in the request language; fall back to the stored German text.

    ``{namespaces}`` is filled from the scope the reader still sees, so a user who
    lost one of several namespaces never sees that namespace's name.
    """
    response = NotificationResponse.model_validate(n)
    if n.message_key:
        params = dict(n.params or {})
        visible = _visible_scope(n, current_user)
        if visible is not None:
            params["namespaces"] = namespace_label(visible)
        rendered = render_notification(n.message_key, params, get_language())
        if rendered is not None:
            response.title, response.message = rendered
    return response


_LIST_LIMIT = 50
# Scoped rows hidden on read can push visible ones out of a plain LIMIT 50, so
# read a wider window and trim after filtering.
_LIST_SCAN_LIMIT = 200


def _visible_to(n: Notification, current_user: CurrentUser) -> bool:
    """Hide snapshot-targeted notifications about namespaces the reader no longer sees.

    Recipients of such notifications were picked from a namespace snapshot that
    may be stale; the live request namespaces are authoritative. Applies to every
    endpoint that returns notification content, including mark-read.
    """
    visible = _visible_scope(n, current_user)
    return visible is None or len(visible) > 0


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[NotificationResponse]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(_LIST_SCAN_LIMIT)
    )
    visible = [n for n in result.scalars().all() if _visible_to(n, current_user)]
    return [_to_response(n, current_user) for n in visible[:_LIST_LIMIT]]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> UnreadCountResponse:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read == False,  # noqa: E712
        )
    )
    count = sum(1 for n in result.scalars().all() if _visible_to(n, current_user))
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> NotificationResponse:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    n = result.scalar_one_or_none()
    # A notification hidden by namespace scope is treated exactly like a missing one.
    if n is None or not _visible_to(n, current_user):
        raise ApiError(404, "not_found")
    n.read = True
    await db.commit()
    await db.refresh(n)
    return _to_response(n, current_user)


@router.post("/read-all", status_code=204)
async def mark_all_read(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read == False)  # noqa: E712
        .values(read=True)
    )
    await db.commit()


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    # Recipient-scoped: only deletes a row the current user owns. Idempotent:
    # returns 204 even when nothing matches (already deleted or not owned).
    await db.execute(
        delete(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    await db.commit()


@router.delete("", status_code=204)
async def clear_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    # Removes every stored notification for the current user, including rows
    # older than the 50 the list endpoint returns. Idempotent (204 when empty).
    await db.execute(delete(Notification).where(Notification.user_id == current_user.id))
    await db.commit()
