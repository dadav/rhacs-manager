import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..schemas.common import PaginatedResponse
from ..schemas.my_comments import MyCommentKind, MyCommentThread
from ..services.my_comments_service import list_my_comment_threads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("/mine", response_model=PaginatedResponse[MyCommentThread])
async def list_my_comments(
    kind: MyCommentKind | None = Query(None),
    only_with_replies: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> PaginatedResponse[MyCommentThread]:
    threads = await list_my_comment_threads(app_db, sx_db, current_user, kind=kind, only_with_replies=only_with_replies)
    start = (page - 1) * page_size
    logger.info(
        "my_comments_listed",
        extra={
            "user_id": current_user.id,
            "kind": kind,
            "only_with_replies": only_with_replies,
            "threads": len(threads),
            "page": page,
        },
    )
    return PaginatedResponse[MyCommentThread](
        items=threads[start : start + page_size], total=len(threads), page=page, page_size=page_size
    )
