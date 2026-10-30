import time
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..badges.generator import generate_badge_svg
from ..config import settings
from ..deps import get_app_db, get_stackrox_db
from ..i18n import ApiError
from ..models.badge import BadgeToken
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..schemas.badge import BadgeCreate, BadgeResponse
from ..stackrox import queries as sx

router = APIRouter(prefix="/badges", tags=["badges"])

# Server-side SVG cache: token -> (svg_string, timestamp)
_svg_cache: dict[str, tuple[str, float]] = {}
_SVG_CACHE_TTL = 300  # 5 minutes, matches Cache-Control max-age
_SVG_CACHE_MAX_SIZE = 10_000


def _evict_svg_cache() -> None:
    """Evict expired entries; if still over max size, evict oldest entries."""
    now = time.monotonic()
    # Remove expired entries
    expired = [k for k, (_, ts) in _svg_cache.items() if (now - ts) >= _SVG_CACHE_TTL]
    for k in expired:
        del _svg_cache[k]
    # If still over limit, evict oldest
    if len(_svg_cache) >= _SVG_CACHE_MAX_SIZE:
        by_age = sorted(_svg_cache.items(), key=lambda item: item[1][1])
        to_remove = len(_svg_cache) - _SVG_CACHE_MAX_SIZE + 1
        for k, _ in by_age[:to_remove]:
            del _svg_cache[k]


def _badge_url(token: str) -> str:
    path = f"/api/badges/{token}/status.svg"
    if settings.badge_base_url:
        return f"{settings.badge_base_url.rstrip('/')}{path}"
    return path


def _user_can_see_badge(user: CurrentUser, badge: BadgeToken) -> bool:
    """Scope-aware badge visibility.

    Privileged users (sec team or wildcard) see every badge. A scoped user sees a
    badge only if its scope is fully contained in their visible namespaces; all-scope
    badges (no namespace and no stored scope_namespaces) are hidden from scoped users.
    """
    if user.can_see_all_namespaces:
        return True
    user_ns = set(user.namespaces)  # set of (namespace, cluster)
    # Explicit single-namespace badge.
    if badge.namespace and badge.cluster_name:
        return (badge.namespace, badge.cluster_name) in user_ns
    # Legacy namespace-only badge without stored pairs.
    if badge.namespace and not badge.scope_namespaces:
        return any(ns == badge.namespace for ns, _ in user_ns)
    # Multi-namespace scoped badge: every scoped pair must be visible (subset).
    if badge.scope_namespaces:
        scope = {(entry[0], entry[1]) for entry in badge.scope_namespaces}
        return scope <= user_ns
    # All-scope badge -> privileged users only.
    return False


async def _badge_scope_pairs(badge: BadgeToken, sx_db: AsyncSession) -> list[tuple[str, str]] | None:
    """(namespace, cluster) pairs a badge counts, or None for all namespaces.

    Users can see the same namespace name on several clusters (cross-cluster
    access), so a partial filter must never be widened to "all" or narrowed to an
    empty cluster name.
    """
    if badge.namespace and badge.cluster_name:
        return [(badge.namespace, badge.cluster_name)]
    if badge.scope_namespaces is not None:
        return [(entry[0], entry[1]) for entry in badge.scope_namespaces]
    if badge.namespace:
        # Legacy namespace-only row without stored pairs: the creator may have been
        # scoped, so expanding by name could count unauthorized clusters. Fail closed
        # (these rendered zero before as well); recreate the badge to fix it.
        return []
    if badge.cluster_name:
        # Cluster-only rows without stored pairs only come from wildcard creators
        # (scoped creators always store pairs): expand that cluster against StackRox.
        return await _stackrox_pairs(sx_db, None, badge.cluster_name)
    return None


async def _stackrox_pairs(
    sx_db: AsyncSession,
    namespace: str | None,
    cluster_name: str | None,
) -> list[tuple[str, str]]:
    """Every StackRox (namespace, cluster) pair matching the optional filters."""
    rows = await sx.list_namespaces(sx_db)
    return [
        (row["namespace"], row["cluster_name"])
        for row in rows
        if (not namespace or row["namespace"] == namespace)
        and (not cluster_name or row["cluster_name"] == cluster_name)
    ]


def _creator_scope_pairs(
    user: CurrentUser,
    namespace: str | None,
    cluster_name: str | None,
) -> list[tuple[str, str]]:
    """The creator's visible pairs matching the optional namespace/cluster filter."""
    return [
        (ns, cluster)
        for ns, cluster in user.namespaces
        if (not namespace or ns == namespace) and (not cluster_name or cluster == cluster_name)
    ]


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
        scope_namespaces=b.scope_namespaces,
    )


@router.get("/{token}/status.svg", include_in_schema=False)
async def get_badge_svg(
    token: str,
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> Response:
    """Public endpoint — no auth required."""
    # Check server-side cache first
    cached = _svg_cache.get(token)
    if cached and (time.monotonic() - cached[1]) < _SVG_CACHE_TTL:
        return Response(
            cached[0],
            media_type="image/svg+xml",
            headers={"Cache-Control": "max-age=300"},
        )

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

    # Sec team badges bypass thresholds (matching CVE list behavior)
    if badge.is_sec_team:
        min_cvss = 0.0
        min_epss = 0.0
    else:
        min_cvss = float(gs.min_cvss_score) if gs else 0.0
        min_epss = float(gs.min_epss_score) if gs else 0.0

    # Build always_show set: prioritized CVEs + active risk acceptances
    prio_result = await app_db.execute(select(CvePriority.cve_id))
    always_show: set[str] = {row[0] for row in prio_result}
    ra_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]))
    )
    always_show |= {row[0] for row in ra_result}

    scope_pairs = await _badge_scope_pairs(badge, sx_db)
    if scope_pairs:
        cves = await sx.get_cves_for_namespaces(sx_db, scope_pairs, min_cvss, min_epss, always_show)
    elif scope_pairs is None:
        # All namespaces (has_all_namespaces user with no namespace/cluster filter)
        cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
    else:
        # Empty list — no scope
        return Response(
            generate_badge_svg(0, 0, 0, 0, badge.label),
            media_type="image/svg+xml",
            headers={"Cache-Control": "max-age=300"},
        )

    critical = sum(1 for c in cves if c.get("severity") == 4)
    high = sum(1 for c in cves if c.get("severity") == 3)
    moderate = sum(1 for c in cves if c.get("severity") == 2)
    low = sum(1 for c in cves if c.get("severity") <= 1)

    svg = generate_badge_svg(critical, high, moderate, low, badge.label)
    if len(_svg_cache) >= _SVG_CACHE_MAX_SIZE:
        _evict_svg_cache()
    _svg_cache[token] = (svg, time.monotonic())
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
    result = await db.execute(select(BadgeToken).order_by(BadgeToken.created_at.desc()))
    badges = [b for b in result.scalars().all() if _user_can_see_badge(current_user, b)]
    # Optional narrowing by the UI's selected scope.
    if cluster:
        badges = [b for b in badges if b.cluster_name == cluster or b.cluster_name is None]
    if namespace:
        badges = [b for b in badges if b.namespace == namespace or b.namespace is None]
    return [await _build_response(b, db) for b in badges]


@router.post("", response_model=BadgeResponse, status_code=201)
async def create_badge(
    body: BadgeCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> BadgeResponse:
    if not current_user.has_namespaces:
        raise ApiError(400, "no_namespaces")

    # Store the exact pairs a partial filter means, so the public SVG endpoint and
    # the listing check (_user_can_see_badge) see one unambiguous scope (a namespace
    # name may exist on several clusters):
    # - scoped users: their visible pairs matching the filter (everything if no filter)
    # - wildcard users, namespace-only: that namespace's StackRox pairs at creation
    # - wildcard users, cluster-only or no filter: None, expanded at render time
    # - exact namespace+cluster: None, the badge columns are the scope
    scope_ns = None
    if current_user.has_all_namespaces:
        if body.namespace and not body.cluster_name:
            pairs = await _stackrox_pairs(sx_db, body.namespace, None)
            if not pairs:
                raise ApiError(400, "badge_namespace_not_accessible")
            scope_ns = [[ns, cluster] for ns, cluster in pairs]
    else:
        pairs = _creator_scope_pairs(current_user, body.namespace, body.cluster_name)
        if (body.namespace or body.cluster_name) and not pairs:
            raise ApiError(400, "badge_namespace_not_accessible")
        if not (body.namespace and body.cluster_name):
            scope_ns = [[ns, cluster] for ns, cluster in pairs]

    badge = BadgeToken(
        created_by=current_user.id,
        namespace=body.namespace,
        cluster_name=body.cluster_name,
        label=body.label,
        scope_namespaces=scope_ns,
        is_sec_team=current_user.is_sec_team,
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
        raise ApiError(404, "not_found")
    if not current_user.is_sec_team and badge.created_by != current_user.id:
        raise ApiError(403, "forbidden")
    _svg_cache.pop(badge.token, None)
    await db.delete(badge)
    await db.commit()
