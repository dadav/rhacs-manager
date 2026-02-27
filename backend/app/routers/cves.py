from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.team import TeamNamespace
from ..schemas.cve import AffectedComponent, AffectedDeployment, CveDetail, CveListItem, SeverityLevel
from ..schemas.common import PaginatedResponse
from ..stackrox import queries as sx

router = APIRouter(prefix="/cves", tags=["cves"])


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


async def _get_team_namespaces(db: AsyncSession, team_id) -> list[tuple[str, str]]:
    r = await db.execute(select(TeamNamespace).where(TeamNamespace.team_id == team_id))
    return [(n.namespace, n.cluster_name) for n in r.scalars().all()]


def _build_cve_item(
    c: dict,
    priorities: dict,
    acceptances: dict,
) -> CveListItem:
    p = priorities.get(c["cve_id"])
    a = acceptances.get(c["cve_id"])
    return CveListItem(
        cve_id=c["cve_id"],
        severity=SeverityLevel(c.get("severity", 0)),
        cvss=float(c.get("cvss", 0)),
        epss_probability=float(c.get("epss_probability", 0)),
        impact_score=float(c.get("impact_score", 0)),
        fixable=bool(c.get("fixable", False)),
        fixed_by=c.get("fixed_by"),
        affected_images=int(c.get("affected_images", 0)),
        affected_deployments=int(c.get("affected_deployments", 0)),
        first_seen=c.get("first_seen"),
        operating_system=c.get("operating_system"),
        has_priority=p is not None,
        priority_level=p.priority.value if p else None,
        priority_deadline=p.deadline if p else None,
        has_risk_acceptance=a is not None,
        risk_acceptance_status=a.status.value if a else None,
        risk_acceptance_id=str(a.id) if a else None,
    )


@router.get("", response_model=PaginatedResponse[CveListItem])
async def list_cves(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    severity: int | None = Query(None),
    fixable: bool | None = Query(None),
    prioritized_only: bool = Query(False),
    sort_by: str = Query("severity"),
    sort_desc: bool = Query(True),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> PaginatedResponse[CveListItem]:
    settings = await _get_settings(app_db)
    min_cvss = float(settings.min_cvss_score) if settings else 0.0
    min_epss = float(settings.min_epss_score) if settings else 0.0

    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved])
    )
    if not current_user.is_sec_team and current_user.team_id:
        ra_query = ra_query.where(RiskAcceptance.team_id == current_user.team_id)
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    if current_user.is_sec_team:
        cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
    else:
        if not current_user.team_id:
            return PaginatedResponse(items=[], total=0, page=page, page_size=page_size)
        ns = await _get_team_namespaces(app_db, current_user.team_id)
        cves = await sx.get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss, always_show)

    # Build items
    items = [_build_cve_item(c, priorities, acceptances) for c in cves]

    # Filter
    if search:
        s = search.lower()
        items = [i for i in items if s in i.cve_id.lower()]
    if severity is not None:
        items = [i for i in items if i.severity == severity]
    if fixable is not None:
        items = [i for i in items if i.fixable == fixable]
    if prioritized_only:
        items = [i for i in items if i.has_priority]

    # Sort
    sort_key_map = {
        "severity": lambda x: x.severity.value,
        "cvss": lambda x: x.cvss,
        "epss_probability": lambda x: x.epss_probability,
        "affected_deployments": lambda x: x.affected_deployments,
        "first_seen": lambda x: x.first_seen or "",
    }
    key_fn = sort_key_map.get(sort_by, lambda x: x.severity.value)
    items.sort(key=key_fn, reverse=sort_desc)

    total = len(items)
    start = (page - 1) * page_size
    return PaginatedResponse(
        items=items[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{cve_id}", response_model=CveDetail)
async def get_cve(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> CveDetail:
    prio_result = await app_db.execute(
        select(CvePriority).where(CvePriority.cve_id == cve_id)
    )
    priority = prio_result.scalar_one_or_none()

    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.cve_id == cve_id,
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
    )
    if not current_user.is_sec_team and current_user.team_id:
        ra_query = ra_query.where(RiskAcceptance.team_id == current_user.team_id)
    ra_result = await app_db.execute(ra_query)
    acceptance = ra_result.scalar_one_or_none()

    if current_user.is_sec_team:
        ns: list[tuple[str, str]] = []
        cve_data = await sx.get_all_cves(sx_db)
        cve_data = next((c for c in cve_data if c["cve_id"] == cve_id), None)
        # get_cve_detail needs namespace list; for sec team we use empty = all
        from ..stackrox.queries import get_affected_deployments, get_affected_components
        # Use a simpler approach: get all namespaces
        all_ns = await sx.list_namespaces(sx_db)
        ns = [(r["namespace"], r["cluster_name"]) for r in all_ns]
    else:
        if not current_user.team_id:
            raise HTTPException(404, "CVE nicht gefunden")
        ns = await _get_team_namespaces(app_db, current_user.team_id)
        cve_data = await sx.get_cve_detail(sx_db, cve_id, ns)

    if not cve_data:
        raise HTTPException(404, "CVE nicht gefunden")

    deployments = await sx.get_affected_deployments(sx_db, cve_id, ns)
    components = await sx.get_affected_components(sx_db, cve_id, ns)

    return CveDetail(
        cve_id=cve_data["cve_id"],
        severity=SeverityLevel(cve_data.get("severity", 0)),
        cvss=float(cve_data.get("cvss", 0)),
        epss_probability=float(cve_data.get("epss_probability", 0)),
        impact_score=float(cve_data.get("impact_score", 0)),
        fixable=bool(cve_data.get("fixable", False)),
        fixed_by=cve_data.get("fixed_by"),
        affected_images=int(cve_data.get("affected_images", 0)),
        affected_deployments=int(cve_data.get("affected_deployments", 0)),
        first_seen=cve_data.get("first_seen"),
        operating_system=cve_data.get("operating_system"),
        has_priority=priority is not None,
        priority_level=priority.priority.value if priority else None,
        priority_deadline=priority.deadline if priority else None,
        has_risk_acceptance=acceptance is not None,
        risk_acceptance_status=acceptance.status.value if acceptance else None,
        risk_acceptance_id=str(acceptance.id) if acceptance else None,
        affected_deployments_list=[
            AffectedDeployment(
                deployment_id=str(d["deployment_id"]),
                deployment_name=d["deployment_name"],
                namespace=d["namespace"],
                cluster_name=d["cluster_name"],
                image_name=d.get("image_name", ""),
            )
            for d in deployments
        ],
        components=[
            AffectedComponent(
                component_name=c["component_name"],
                component_version=c["component_version"],
                fixable=bool(c.get("fixable", False)),
                fixed_by=c.get("fixed_by"),
            )
            for c in components
        ],
    )


@router.get("/{cve_id}/deployments", response_model=list[AffectedDeployment])
async def get_cve_deployments(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[AffectedDeployment]:
    if current_user.is_sec_team:
        all_ns = await sx.list_namespaces(sx_db)
        ns = [(r["namespace"], r["cluster_name"]) for r in all_ns]
    else:
        if not current_user.team_id:
            return []
        ns = await _get_team_namespaces(app_db, current_user.team_id)

    deployments = await sx.get_affected_deployments(sx_db, cve_id, ns)
    return [
        AffectedDeployment(
            deployment_id=str(d["deployment_id"]),
            deployment_name=d["deployment_name"],
            namespace=d["namespace"],
            cluster_name=d["cluster_name"],
            image_name=d.get("image_name", ""),
        )
        for d in deployments
    ]
