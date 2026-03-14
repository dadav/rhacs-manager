from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_comment import CveComment
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.escalation import Escalation
from ..models.namespace_contact import NamespaceContact
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..models.user import User
from ..schemas.cve import (
    AffectedComponent,
    AffectedDeployment,
    CveCommentCreate,
    CveCommentResponse,
    CveDetail,
    CveListItem,
    ImageCveDetail,
    ImageCveGroup,
    SeverityLevel,
)
from ..schemas.common import PaginatedResponse
from ..services.cve_filter_service import fetch_filtered_cves
from ..stackrox import queries as sx

router = APIRouter(prefix="/cves", tags=["cves"])


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


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
    age_min: int | None = Query(None, ge=0),
    age_max: int | None = Query(None, ge=0),
    deployment: str | None = Query(None),
    show_suppressed: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> PaginatedResponse[CveListItem]:
    items = await fetch_filtered_cves(
        current_user,
        app_db,
        sx_db,
        search=search,
        severity=severity,
        fixable=fixable,
        prioritized_only=prioritized_only,
        sort_by=sort_by,
        sort_desc=sort_desc,
        cvss_min=cvss_min,
        epss_min=epss_min,
        component=component,
        risk_status=risk_status,
        cluster=cluster,
        namespace=namespace,
        age_min=age_min,
        age_max=age_max,
        deployment=deployment,
        show_suppressed=show_suppressed,
    )

    total = len(items)
    start = (page - 1) * page_size
    return PaginatedResponse(
        items=items[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/by-image", response_model=list[ImageCveGroup])
async def list_cves_by_image(
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    search: str | None = Query(None),
    severity: int | None = Query(None),
    fixable: bool | None = Query(None),
    cvss_min: float | None = Query(None, ge=0, le=10),
    epss_min: float | None = Query(None, ge=0, le=1),
    component: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[ImageCveGroup]:
    """CVEs grouped by container image — shows which images have the most CVEs."""
    settings = await _get_settings(app_db)
    if current_user.is_sec_team:
        min_cvss = 0.0
        min_epss = 0.0
    else:
        min_cvss = float(settings.min_cvss_score) if settings else 0.0
        min_epss = float(settings.min_epss_score) if settings else 0.0

    from ._scope import narrow_namespaces

    has_scope = cluster is not None or namespace is not None
    if current_user.can_see_all_namespaces:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            namespaces_list: list[tuple[str, str]] | None = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns],
                cluster,
                namespace,
            )
        else:
            namespaces_list = None
    else:
        if not current_user.has_namespaces:
            return []
        namespaces_list = narrow_namespaces(current_user.namespaces, cluster, namespace)

    prio_result = await app_db.execute(select(CvePriority.cve_id))
    always_show: set[str] = {row[0] for row in prio_result}
    ra_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
    )
    always_show |= {row[0] for row in ra_result}

    rows = await sx.get_cves_grouped_by_image(
        sx_db,
        namespaces_list,
        min_cvss,
        min_epss,
        always_show,
        search=search,
        severity=severity,
        fixable=fixable,
        cvss_min=cvss_min,
        epss_min=epss_min,
        component=component,
    )
    return [
        ImageCveGroup(
            image_name=r["image_name"] or "unknown",
            image_id=r["image_id"] or "",
            total_cves=r["total_cves"],
            critical_cves=r["critical_cves"],
            high_cves=r["high_cves"],
            medium_cves=r["medium_cves"],
            low_cves=r["low_cves"],
            max_cvss=float(r["max_cvss"]),
            max_epss=float(r["max_epss"]),
            fixable_cves=r["fixable_cves"],
            affected_deployments=r["affected_deployments"],
            namespaces=list(r["namespaces"]) if r["namespaces"] else [],
            clusters=list(r["clusters"]) if r["clusters"] else [],
        )
        for r in rows
    ]


@router.get("/by-image/{image_id:path}/cves", response_model=list[ImageCveDetail])
async def list_cves_for_image(
    image_id: str,
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    search: str | None = Query(None),
    severity: int | None = Query(None),
    fixable: bool | None = Query(None),
    cvss_min: float | None = Query(None),
    epss_min: float | None = Query(None),
    component: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> list[ImageCveDetail]:
    """Get all visible CVEs for a specific image."""
    settings = await _get_settings(app_db)
    if current_user.is_sec_team:
        min_cvss = 0.0
        min_epss = 0.0
    else:
        min_cvss = float(settings.min_cvss_score) if settings else 0.0
        min_epss = float(settings.min_epss_score) if settings else 0.0

    from ._scope import narrow_namespaces

    has_scope = cluster is not None or namespace is not None
    if current_user.can_see_all_namespaces:
        if has_scope:
            all_ns = await sx.list_namespaces(sx_db)
            namespaces_list: list[tuple[str, str]] | None = narrow_namespaces(
                [(r["namespace"], r["cluster_name"]) for r in all_ns],
                cluster,
                namespace,
            )
        else:
            namespaces_list = None
    else:
        if not current_user.has_namespaces:
            return []
        namespaces_list = narrow_namespaces(current_user.namespaces, cluster, namespace)

    prio_result = await app_db.execute(select(CvePriority.cve_id))
    always_show: set[str] = {row[0] for row in prio_result}
    ra_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
    )
    always_show |= {row[0] for row in ra_result}

    rows = await sx.get_cves_for_image(
        sx_db,
        image_id,
        namespaces_list,
        min_cvss,
        min_epss,
        always_show,
        search=search,
        severity=severity,
        fixable=fixable,
        filter_cvss_min=cvss_min,
        filter_epss_min=epss_min,
        component=component,
    )
    return [
        ImageCveDetail(
            cve_id=r["cve_id"],
            severity=SeverityLevel(r["severity"]),
            cvss=float(r["cvss"]),
            epss_probability=float(r["epss_probability"]),
            impact_score=float(r["impact_score"]),
            fixable=bool(r["fixable"]),
            fixed_by=r.get("fixed_by"),
            affected_deployments=int(r["affected_deployments"]),
            first_seen=r.get("first_seen"),
            published_on=r.get("published_on"),
        )
        for r in rows
    ]


@router.get("/{cve_id}", response_model=CveDetail)
async def get_cve(
    cve_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> CveDetail:
    prio_result = await app_db.execute(
        select(CvePriority)
        .options(selectinload(CvePriority.setter))
        .where(CvePriority.cve_id == cve_id)
    )
    priority = prio_result.scalar_one_or_none()

    ra_query = (
        select(RiskAcceptance)
        .where(
            RiskAcceptance.cve_id == cve_id,
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
        .order_by(
            # Prefer approved over requested, then most recent
            RiskAcceptance.status.asc(),
            RiskAcceptance.created_at.desc(),
        )
    )
    ra_result = await app_db.execute(ra_query)
    acceptance = ra_result.scalars().first()

    esc_result = await app_db.execute(
        select(Escalation).where(Escalation.cve_id == cve_id)
    )
    escalations = esc_result.scalars().all()
    esc_dates: dict[int, datetime | None] = {1: None, 2: None, 3: None}
    for esc in escalations:
        cur = esc_dates.get(esc.level)
        if cur is None or esc.triggered_at < cur:
            esc_dates[esc.level] = esc.triggered_at

    if current_user.can_see_all_namespaces:
        all_ns = await sx.list_namespaces(sx_db)
        ns: list[tuple[str, str]] = [
            (r["namespace"], r["cluster_name"]) for r in all_ns
        ]
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
                    esc_expected[1] = first_seen + timedelta(
                        days=rule.get("days_to_level1", 999)
                    )
                    esc_expected[2] = first_seen + timedelta(
                        days=rule.get("days_to_level2", 999)
                    )
                    esc_expected[3] = first_seen + timedelta(
                        days=rule.get("days_to_level3", 999)
                    )
                    break  # first matching rule only

    deployments = await sx.get_affected_deployments(sx_db, cve_id, ns)
    components = await sx.get_affected_components(sx_db, cve_id, ns)
    contact_emails: list[str] = []
    if current_user.can_see_all_namespaces and deployments:
        ns_cluster_pairs = sorted(
            {
                (d["namespace"], d["cluster_name"])
                for d in deployments
                if d.get("namespace") and d.get("cluster_name")
            }
        )
        if ns_cluster_pairs:
            from ..config import settings as app_settings

            contact_result = await app_db.execute(
                select(NamespaceContact).where(
                    tuple_(
                        NamespaceContact.namespace,
                        NamespaceContact.cluster_name,
                    ).in_(ns_cluster_pairs)
                )
            )
            contacts = contact_result.scalars().all()
            covered_pairs = {(c.namespace, c.cluster_name) for c in contacts}
            contact_emails = sorted(
                {c.escalation_email for c in contacts if c.escalation_email}
            )

            # Add default escalation email for namespaces without explicit contacts
            uncovered = set(ns_cluster_pairs) - covered_pairs
            if uncovered and app_settings.default_escalation_email:
                contact_emails = sorted(
                    set(contact_emails) | {app_settings.default_escalation_email}
                )

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
        priority_reason=priority.reason if priority else None,
        priority_set_by_name=priority.setter.username if priority else None,
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
        contact_emails=contact_emails,
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
        select(CveComment)
        .where(CveComment.cve_id == cve_id)
        .order_by(CveComment.created_at)
    )
    comments = result.scalars().all()

    out = []
    for c in comments:
        user_result = await app_db.execute(select(User).where(User.id == c.user_id))
        user = user_result.scalar_one_or_none()
        out.append(
            CveCommentResponse(
                id=c.id,
                cve_id=c.cve_id,
                user_id=c.user_id,
                username=user.username if user else c.user_id,
                message=c.message,
                created_at=c.created_at,
                is_sec_team=user.role.value == "sec_team" if user else False,
            )
        )
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
    if current_user.can_see_all_namespaces:
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
