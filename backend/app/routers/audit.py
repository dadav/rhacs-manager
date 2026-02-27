from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import require_sec_team, CurrentUser
from ..deps import get_app_db
from ..models.audit_log import AuditLog
from ..models.user import User
from ..schemas.common import PaginatedResponse

router = APIRouter(prefix="/audit-log", tags=["audit"])


@router.get("", response_model=PaginatedResponse[dict])
async def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> PaginatedResponse[dict]:
    count_result = await db.execute(select(func.count(AuditLog.id)))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    entries = result.scalars().all()

    user_ids = list({e.user_id for e in entries if e.user_id})
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u.username for u in users_result.scalars().all()}

    items = [
        {
            "id": str(e.id),
            "user_id": e.user_id,
            "username": users.get(e.user_id) if e.user_id else None,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]

    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)
