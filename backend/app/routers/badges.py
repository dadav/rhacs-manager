from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..badges.generator import generate_badge_svg
from ..config import settings
from ..deps import get_app_db, get_stackrox_db
from ..models.badge import BadgeToken
from ..models.global_settings import GlobalSettings
from ..models.team import TeamNamespace
from ..schemas.badge import BadgeCreate, BadgeResponse
from ..stackrox import queries as sx

router = APIRouter(prefix="/badges", tags=["badges"])


def _badge_url(token: str, base: str) -> str:
    return f"{base}/api/badges/{token}/status.svg"


async def _build_response(b: BadgeToken, db: AsyncSession) -> BadgeResponse:
    return BadgeResponse(
        id=b.id,
        team_id=b.team_id,
        namespace=b.namespace,
        cluster_name=b.cluster_name,
        token=b.token,
        label=b.label,
        created_at=b.created_at,
        badge_url=_badge_url(b.token, settings.app_base_url),
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

    if badge.namespace:
        ns = [(badge.namespace, badge.cluster_name or "")]
    else:
        ns_result = await app_db.execute(
            select(TeamNamespace).where(TeamNamespace.team_id == badge.team_id)
        )
        ns = [(n.namespace, n.cluster_name) for n in ns_result.scalars().all()]

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
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> list[BadgeResponse]:
    if current_user.is_sec_team:
        result = await db.execute(select(BadgeToken).order_by(BadgeToken.created_at.desc()))
    else:
        if not current_user.team_id:
            return []
        result = await db.execute(
            select(BadgeToken)
            .where(BadgeToken.team_id == current_user.team_id)
            .order_by(BadgeToken.created_at.desc())
        )
    return [await _build_response(b, db) for b in result.scalars().all()]


@router.post("", response_model=BadgeResponse, status_code=201)
async def create_badge(
    body: BadgeCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
) -> BadgeResponse:
    if not current_user.team_id and not current_user.is_sec_team:
        raise HTTPException(400, "Kein Team zugeordnet")
    if current_user.is_sec_team:
        raise HTTPException(403, "Nur Team-Mitglieder können Badges erstellen")

    badge = BadgeToken(
        team_id=current_user.team_id,
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
    if not current_user.is_sec_team and badge.team_id != current_user.team_id:
        raise HTTPException(403, "Kein Zugriff")
    await db.delete(badge)
    await db.commit()
