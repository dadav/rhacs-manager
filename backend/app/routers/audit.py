from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, require_sec_team
from ..deps import get_app_db
from ..exports.audit_excel_generator import generate_audit_excel
from ..i18n import ApiError
from ..models.audit_log import AuditLog
from ..models.user import User
from ..schemas.common import PaginatedResponse

router = APIRouter(prefix="/audit-log", tags=["audit"])

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _parse_date(raw: str | None) -> datetime | None:
    """Parse a YYYY-MM-DD filter value; raise a localized 400 on bad input."""
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d")
    except ValueError:
        raise ApiError(400, "invalid_date") from None


def _build_conditions(
    search: str | None,
    action: str | None,
    entity_type: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> list:
    """Build the shared WHERE conditions for the list and export queries.

    ``search`` matches action, entity_type, entity_id, and (via a correlated
    subquery) the username on the related user. ``date_to`` is inclusive of the
    whole day.
    """
    conditions: list = []
    if action:
        conditions.append(AuditLog.action == action)
    if entity_type:
        conditions.append(AuditLog.entity_type == entity_type)
    if search:
        pattern = f"%{search}%"
        conditions.append(
            or_(
                AuditLog.action.ilike(pattern),
                AuditLog.entity_type.ilike(pattern),
                AuditLog.entity_id.ilike(pattern),
                AuditLog.user_id.in_(select(User.id).where(User.username.ilike(pattern))),
            )
        )
    if date_from:
        conditions.append(AuditLog.created_at >= date_from)
    if date_to:
        conditions.append(AuditLog.created_at < date_to + timedelta(days=1))
    return conditions


async def _resolve_usernames(db: AsyncSession, entries: list[AuditLog]) -> dict[str, str]:
    """Map user_id -> username for the given entries in a single query."""
    user_ids = list({e.user_id for e in entries if e.user_id})
    if not user_ids:
        return {}
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {u.id: u.username for u in users_result.scalars().all()}


@router.get("", response_model=PaginatedResponse[dict])
async def list_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> PaginatedResponse[dict]:
    conditions = _build_conditions(search, action, entity_type, _parse_date(date_from), _parse_date(date_to))

    count_result = await db.execute(select(func.count(AuditLog.id)).where(*conditions))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(AuditLog)
        .where(*conditions)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    entries = result.scalars().all()
    usernames = await _resolve_usernames(db, entries)

    items = [
        {
            "id": str(e.id),
            "user_id": e.user_id,
            "username": usernames.get(e.user_id) if e.user_id else None,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "details": e.details,
            "created_at": e.created_at.isoformat(),
        }
        for e in entries
    ]

    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/filters")
async def audit_filters(
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> dict:
    """Distinct action and entity_type values present in the log, for dropdowns."""
    actions_result = await db.execute(select(distinct(AuditLog.action)).order_by(AuditLog.action))
    entity_result = await db.execute(select(distinct(AuditLog.entity_type)).order_by(AuditLog.entity_type))
    return {
        "actions": list(actions_result.scalars().all()),
        "entity_types": list(entity_result.scalars().all()),
    }


@router.get("/export")
async def export_audit_log(
    search: str | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    lang: str = Query("de"),
    _: CurrentUser = Depends(require_sec_team),
    db: AsyncSession = Depends(get_app_db),
) -> Response:
    conditions = _build_conditions(search, action, entity_type, _parse_date(date_from), _parse_date(date_to))

    result = await db.execute(select(AuditLog).where(*conditions).order_by(AuditLog.created_at.desc()))
    entries = result.scalars().all()
    usernames = await _resolve_usernames(db, entries)

    rows = [
        {
            "created_at": e.created_at,
            "username": usernames.get(e.user_id) if e.user_id else None,
            "action": e.action,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "details": e.details,
        }
        for e in entries
    ]

    xlsx_bytes = generate_audit_excel(rows, lang=lang)
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    prefix = "audit-log" if lang == "en" else "audit-protokoll"

    return Response(
        content=xlsx_bytes,
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{prefix}-{today}.xlsx"'},
    )
