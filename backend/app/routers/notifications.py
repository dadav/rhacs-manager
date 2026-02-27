from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..models.notification import Notification
from ..schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[NotificationResponse]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


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
    count = len(result.scalars().all())
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
    if n:
        n.read = True
        await db.commit()
        await db.refresh(n)
    return NotificationResponse.model_validate(n)


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
