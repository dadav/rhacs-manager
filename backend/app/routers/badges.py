from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..badges.generator import generate_badge_svg
from ..config import settings
from ..deps import get_app_db, get_stackrox_db
from ..models.badge import BadgeToken
from ..models.global_settings import GlobalSettings
from ..schemas.badge import BadgeCreate, BadgeResponse
from ..stackrox import queries as sx

router = APIRouter(prefix="/badges", tags=["badges"])


def _badge_url(token: str) -> str:
    path = f"/api/badges/{token}/status.svg"
    if settings.badge_base_url:
        return f"{settings.badge_base_url.rstrip('/')}{path}"
    return path


async def _build_response(b: BadgeToken, db: AsyncSession) -> BadgeResponse:
    return BadgeResponse(
        id=b.id,
        created_by=b.created_by,
        namespace=b.namespace,
        cluster_name=b.cluster_name,
        token=b.token,
        label=b.label,
        created_at=b.created_at,
        badge_url=_badge_url(b.token),
    )


@router.get("/{token}/status.svg", include_in_schema=False)
async def get_badge_svg(
    token: str,
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> Response:
    """Public endpoint — no auth required."""
    result = await app_db.execute(select(BadgeToken).where(BadgeToken.token == token))
    badge = result.scalar_one_or_none()
    if not badge:
        return Response(
            generate_badge_svg(0, 0, 0, 0, "nicht gefunden"),
            media_type="image/svg+xml",
            headers={"Cache-Control": "max-age=300"},
        )

    settings_result = await app_db.execute(select(GlobalSettings).limit(1))
    gs = settings_result.scalar_one_or_none()
    min_cvss = float(gs.min_cvss_score) if gs else 0.0
    min_epss = float(gs.min_epss_score) if gs else 0.0

    # Badge always scoped by its namespace/cluster
    if badge.namespace:
        ns = [(badge.namespace, badge.cluster_name or "")]
    else:
        # No namespace specified — show empty
        ns = []

    if not ns:
        return Response(
            generate_badge_svg(0, 0, 0, 0, badge.label),
            media_type="image/svg+xml",
            headers={"Cache-Control": "max-age=300"},
        )

    cves = await sx.get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss)

    critical = sum(1 for c in cves if c.get("severity") == 4)
    high = sum(1 for c in cves if c.get("severity") == 3)
    moderate = sum(1 for c in cves if c.get("severity") == 2)
    low = sum(1 for c in cves if c.get("severity") <= 1)

    svg = generate_badge_svg(critical, high, moderate, low, badge.label)
    return Response(
        svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "max-age=300"},
    )


@router.get("", response_model=list[BadgeResponse])
async def list_badges(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[BadgeResponse]:
    if current_user.is_sec_team:
        query = select(BadgeToken).order_by(BadgeToken.created_at.desc())
    else:
        query = select(BadgeToken).where(BadgeToken.created_by == current_user.id).order_by(BadgeToken.created_at.desc())

    if cluster:
        query = query.where(BadgeToken.cluster_name == cluster)
    if namespace:
        query = query.where(BadgeToken.namespace == namespace)

    result = await db.execute(query)
    return [await _build_response(b, db) for b in result.scalars().all()]


@router.post("", response_model=BadgeResponse, status_code=201)
async def create_badge(
    body: BadgeCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> BadgeResponse:
    if current_user.is_sec_team:
        raise HTTPException(403, "Nur Nutzer können Badges erstellen")
    if not current_user.has_namespaces:
        raise HTTPException(400, "Keine Namespaces zugeordnet")

    # Validate namespace is in user's accessible namespaces
    if body.namespace:
        if body.cluster_name:
            if (body.namespace, body.cluster_name) not in set(current_user.namespaces):
                raise HTTPException(400, "Namespace nicht in Ihren zugänglichen Namespaces")
        else:
            if not any(ns == body.namespace for ns, _ in current_user.namespaces):
                raise HTTPException(400, "Namespace nicht in Ihren zugänglichen Namespaces")

    badge = BadgeToken(
        created_by=current_user.id,
        namespace=body.namespace,
        cluster_name=body.cluster_name,
        label=body.label,
    )
    db.add(badge)
    await db.commit()
    await db.refresh(badge)
    return await _build_response(badge, db)


@router.delete("/{badge_id}", status_code=204)
async def delete_badge(
    badge_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> None:
    result = await db.execute(select(BadgeToken).where(BadgeToken.id == badge_id))
    badge = result.scalar_one_or_none()
    if not badge:
        raise HTTPException(404, "Nicht gefunden")
    if not current_user.is_sec_team and badge.created_by != current_user.id:
        raise HTTPException(403, "Kein Zugriff")
    await db.delete(badge)
    await db.commit()
