from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..models.cve_priority import CvePriority
from ..models.global_settings import GlobalSettings
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..schemas.cve import (
    ImageCveDetail,
    ImageCveTimelinePoint,
    ImageDetailResponse,
    ImageLayer,
    SeverityLevel,
)
from ..stackrox import queries as sx

router = APIRouter(prefix="/images", tags=["images"])


async def _get_settings(db: AsyncSession) -> GlobalSettings | None:
    r = await db.execute(select(GlobalSettings).limit(1))
    return r.scalar_one_or_none()


@router.get("/{image_id:path}", response_model=ImageDetailResponse)
async def get_image_detail(
    image_id: str,
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> ImageDetailResponse:
    """Get detailed information about a single container image."""
    meta = await sx.get_image_metadata(sx_db, image_id)
    layers = await sx.get_image_layers(sx_db, image_id)
    timeline = await sx.get_image_cve_timeline(sx_db, image_id)

    if meta is None:
        raise HTTPException(status_code=404, detail="Image not found")

    # Resolve thresholds and namespace visibility
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
            namespaces_list = []
        else:
            namespaces_list = narrow_namespaces(current_user.namespaces, cluster, namespace)

    # Always-show CVEs (prioritized + active risk acceptances)
    prio_result = await app_db.execute(select(CvePriority.cve_id))
    always_show: set[str] = {row[0] for row in prio_result}
    ra_result = await app_db.execute(
        select(RiskAcceptance.cve_id).where(
            RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
        )
    )
    always_show |= {row[0] for row in ra_result}

    # Fetch CVEs for this image
    cve_rows = await sx.get_cves_for_image(
        sx_db,
        image_id,
        namespaces_list,
        min_cvss,
        min_epss,
        always_show,
    )

    cves = [
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
        for r in cve_rows
    ]

    # Compute severity counts from CVE list
    critical = sum(1 for c in cves if c.severity == SeverityLevel.CRITICAL)
    high = sum(1 for c in cves if c.severity == SeverityLevel.IMPORTANT)
    medium = sum(1 for c in cves if c.severity == SeverityLevel.MODERATE)
    low = sum(1 for c in cves if c.severity in (SeverityLevel.LOW, SeverityLevel.UNKNOWN))
    fixable_count = sum(1 for c in cves if c.fixable)

    return ImageDetailResponse(
        image_id=meta["id"],
        name_fullname=meta["name_fullname"] or meta["id"],
        name_registry=meta.get("name_registry"),
        name_remote=meta.get("name_remote"),
        name_tag=meta.get("name_tag"),
        os=meta.get("scan_operatingsystem"),
        created=meta.get("metadata_v1_created"),
        last_scanned=meta.get("scan_scantime"),
        last_updated=meta.get("lastupdated"),
        docker_user=meta.get("metadata_v1_user"),
        risk_score=float(meta.get("riskscore") or 0),
        top_cvss=float(meta.get("topcvss") or 0),
        component_count=int(meta.get("components") or 0),
        cve_count=len(cves),
        fixable_cves=fixable_count,
        critical_cves=critical,
        high_cves=high,
        medium_cves=medium,
        low_cves=low,
        layers=[
            ImageLayer(idx=row["idx"], instruction=row["instruction"] or "", value=row["value"] or "") for row in layers
        ],
        cve_timeline=[
            ImageCveTimelinePoint(
                month=str(t["month"]),
                critical=int(t["critical"]),
                important=int(t["important"]),
                moderate=int(t["moderate"]),
                low=int(t["low"]),
            )
            for t in timeline
        ],
        cves=cves,
    )
