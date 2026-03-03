from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ._scope import narrow_namespaces
from ..models.cve_comment import CveComment
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.escalation import Escalation
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.user import User
from ..schemas.cve import AffectedComponent, AffectedDeployment, CveCommentCreate, CveCommentResponse, CveDetail, CveListItem, SeverityLevel
from ..schemas.common import PaginatedResponse
from ..stackrox import queries as sx

router = APIRouter(prefix="/cves", tags=["cves"])


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


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
        published_on=c.get("published_on"),
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
    cvss_min: float | None = Query(None, ge=0, le=10),
    epss_min: float | None = Query(None, ge=0, le=1),
    component: str | None = Query(None),
    risk_status: str | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> PaginatedResponse[CveListItem]:
    settings = await _get_settings(app_db)
    min_cvss = float(settings.min_cvss_score) if settings else 0.0
    min_epss = float(settings.min_epss_score) if settings else 0.0

    has_scope = cluster is not None or namespace is not None

    prio_result = await app_db.execute(select(CvePriority))
    priorities = {p.cve_id: p for p in prio_result.scalars().all()}

    ra_query = select(RiskAcceptance).where(
        RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved])
    )
    ra_result = await app_db.execute(ra_query)
    acceptances = {ra.cve_id: ra for ra in ra_result.scalars().all()}

    always_show = set(priorities.keys()) | set(acceptances.keys())

    if current_user.is_sec_team:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            scoped_ns = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns], cluster, namespace,
            )
            cves = await sx.get_cves_for_namespaces(sx_db, scoped_ns, min_cvss, min_epss, always_show)
        else:
            cves = await sx.get_all_cves(sx_db, min_cvss, min_epss, always_show)
    else:
        if not current_user.has_namespaces:
            return PaginatedResponse(items=[], total=0, page=page, page_size=page_size)
        scoped_user_ns = narrow_namespaces(current_user.namespaces, cluster, namespace)
        cves = await sx.get_cves_for_namespaces(sx_db, scoped_user_ns, min_cvss, min_epss, always_show)

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
    if cvss_min is not None:
        items = [i for i in items if i.cvss >= cvss_min]
    if epss_min is not None:
        items = [i for i in items if i.epss_probability >= epss_min]
    if risk_status == "any":
        items = [i for i in items if i.has_risk_acceptance]
    elif risk_status in ("requested", "approved"):
        items = [i for i in items if i.risk_acceptance_status == risk_status]

    # Component filter requires extra StackRox lookup
    if component and items:
        comp_lower = component.lower()
        cve_ids = [i.cve_id for i in items]
        if current_user.is_sec_team:
            all_ns = await sx.list_namespaces(sx_db)
            ns_list: list[tuple[str, str]] = [(r["namespace"], r["cluster_name"]) for r in all_ns]
        else:
            ns_list = current_user.namespaces
        comp_cve_map = await sx.get_cve_component_map(sx_db, cve_ids, ns_list)
        items = [i for i in items if any(comp_lower in c.lower() for c in comp_cve_map.get(i.cve_id, []))]

    # Sort
    sort_key_map = {
        "severity": lambda x: x.severity.value,
        "cvss": lambda x: x.cvss,
        "epss_probability": lambda x: x.epss_probability,
        "affected_deployments": lambda x: x.affected_deployments,
        "first_seen": lambda x: x.first_seen or "",
        "published_on": lambda x: x.published_on or "",
    }
    key_fn = sort_key_map.get(sort_by, lambda x: x.severity.value)
    items.sort(key=key_fn, reverse=sort_desc)
    # Always keep prioritized CVEs at the top, preserving the selected sort order
    # within prioritized/non-prioritized groups.
    items.sort(key=lambda x: 0 if x.has_priority else 1)

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
    ra_result = await app_db.execute(ra_query)
    acceptance = ra_result.scalar_one_or_none()

    esc_result = await app_db.execute(
        select(Escalation).where(Escalation.cve_id == cve_id)
    )
    escalations = esc_result.scalars().all()
    esc_dates: dict[int, datetime | None] = {1: None, 2: None, 3: None}
    for esc in escalations:
        cur = esc_dates.get(esc.level)
        if cur is None or esc.triggered_at < cur:
            esc_dates[esc.level] = esc.triggered_at

    if current_user.is_sec_team:
        all_ns = await sx.list_namespaces(sx_db)
        ns: list[tuple[str, str]] = [(r["namespace"], r["cluster_name"]) for r in all_ns]
        cve_data = await sx.get_all_cves(sx_db)
        cve_data = next((c for c in cve_data if c["cve_id"] == cve_id), None)
    else:
        if not current_user.has_namespaces:
            raise HTTPException(404, "CVE nicht gefunden")
        ns = current_user.namespaces
        cve_data = await sx.get_cve_detail(sx_db, cve_id, ns)

    if not cve_data:
        raise HTTPException(404, "CVE nicht gefunden")

    # Compute expected escalation dates from rules + first_seen
    esc_expected: dict[int, datetime | None] = {1: None, 2: None, 3: None}
    first_seen = cve_data.get("first_seen")
    if first_seen:
        settings = await _get_settings(app_db)
        severity = cve_data.get("severity", 0)
        epss = float(cve_data.get("epss_probability", 0))
        if settings and settings.escalation_rules:
            for rule in settings.escalation_rules:
                severity_ok = severity >= rule.get("severity_min", 0)
                epss_ok = epss >= rule.get("epss_threshold", 0)
                if severity_ok or epss_ok:
                    esc_expected[1] = first_seen + timedelta(days=rule.get("days_to_level1", 999))
                    esc_expected[2] = first_seen + timedelta(days=rule.get("days_to_level2", 999))
                    esc_expected[3] = first_seen + timedelta(days=rule.get("days_to_level3", 999))
                    break  # first matching rule only

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
        published_on=cve_data.get("published_on"),
        operating_system=cve_data.get("operating_system"),
        has_priority=priority is not None,
        priority_level=priority.priority.value if priority else None,
        priority_deadline=priority.deadline if priority else None,
        has_risk_acceptance=acceptance is not None,
        risk_acceptance_status=acceptance.status.value if acceptance else None,
        risk_acceptance_id=str(acceptance.id) if acceptance else None,
        priority_created_at=priority.created_at if priority else None,
        risk_acceptance_requested_at=acceptance.created_at if acceptance else None,
        risk_acceptance_reviewed_at=acceptance.reviewed_at if acceptance else None,
        escalation_level1_at=esc_dates[1],
        escalation_level2_at=esc_dates[2],
        escalation_level3_at=esc_dates[3],
        escalation_level1_expected=esc_expected[1],
        escalation_level2_expected=esc_expected[2],
        escalation_level3_expected=esc_expected[3],
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


@router.get("/{cve_id}/comments", response_model=list[CveCommentResponse])
async def list_cve_comments(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
) -> list[CveCommentResponse]:
    result = await app_db.execute(
        select(CveComment).where(CveComment.cve_id == cve_id).order_by(CveComment.created_at)
    )
    comments = result.scalars().all()

    out = []
    for c in comments:
        user_result = await app_db.execute(select(User).where(User.id == c.user_id))
        user = user_result.scalar_one_or_none()
        out.append(CveCommentResponse(
            id=c.id,
            cve_id=c.cve_id,
            user_id=c.user_id,
            username=user.username if user else c.user_id,
            message=c.message,
            created_at=c.created_at,
            is_sec_team=user.role.value == "sec_team" if user else False,
        ))
    return out


@router.post("/{cve_id}/comments", response_model=CveCommentResponse, status_code=201)
async def add_cve_comment(
    cve_id: str,
    body: CveCommentCreate,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
) -> CveCommentResponse:
    comment = CveComment(
        cve_id=cve_id,
        user_id=current_user.id,
        message=body.message,
    )
    app_db.add(comment)
    await app_db.flush()

    user_result = await app_db.execute(select(User).where(User.id == current_user.id))
    user = user_result.scalar_one_or_none()

    await app_db.commit()
    await app_db.refresh(comment)
    return CveCommentResponse(
        id=comment.id,
        cve_id=comment.cve_id,
        user_id=comment.user_id,
        username=user.username if user else current_user.id,
        message=comment.message,
        created_at=comment.created_at,
        is_sec_team=current_user.is_sec_team,
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
        if not current_user.has_namespaces:
            return []
        ns = current_user.namespaces

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
