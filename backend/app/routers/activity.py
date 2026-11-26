"""ACS activity console feed (``GET /api/activity``).

Read-only and authenticated for every role. Business rules (scope, cursor,
watermark) live in ``services/activity_service.py``; this never queries StackRox.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db
from ..schemas.activity import ActivityFeed
from ..services import activity_service

router = APIRouter(tags=["activity"])


@router.get("/activity", response_model=ActivityFeed)
async def get_activity(
    cluster: str | None = None,
    namespace: str | None = None,
    cursor: str | None = None,
    limit: int = Query(100, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> ActivityFeed:
    return await activity_service.read_activity_feed(
        db,
        current_user,
        cluster=cluster,
        namespace=namespace,
        cursor=cursor,
        limit=limit,
    )
