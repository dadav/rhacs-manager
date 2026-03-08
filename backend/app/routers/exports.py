"""CVE export (PDF/Excel) and Excel import for batch risk acceptance creation."""

import logging
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..exports.excel_generator import generate_cve_excel, parse_import_excel
from ..exports.pdf_generator import generate_cve_pdf
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..schemas.risk_acceptance import RiskScope, RiskScopeTarget
from ..services.audit_service import log_action
from ..services.cve_filter_service import fetch_filtered_cves
from ..services.risk_acceptance_service import scope_key, validate_and_resolve_scope
from ..stackrox import queries as sx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exports", tags=["exports"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


async def _resolve_namespaces(
    current_user: CurrentUser,
    sx_db: AsyncSession,
    cluster: str | None = None,
    namespace: str | None = None,
) -> list[tuple[str, str]]:
    """Resolve the namespace list for the current user, optionally filtered."""
    from ._scope import narrow_namespaces

    if current_user.is_sec_team:
        all_ns = await sx.list_namespaces(sx_db)
        ns_list = [(r["namespace"], r["cluster_name"]) for r in all_ns]
    else:
        if not current_user.has_namespaces:
            return []
        ns_list = list(current_user.namespaces)

    return narrow_namespaces(ns_list, cluster, namespace)


@router.get("/pdf")
async def export_pdf(
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
) -> Response:
    items = await fetch_filtered_cves(
        current_user, app_db, sx_db,
        search=search, severity=severity, fixable=fixable,
        prioritized_only=prioritized_only, sort_by=sort_by, sort_desc=sort_desc,
        cvss_min=cvss_min, epss_min=epss_min, component=component,
        risk_status=risk_status, cluster=cluster, namespace=namespace,
    )

    ns_list = await _resolve_namespaces(current_user, sx_db, cluster, namespace)

    # Enrich each CVE with deployments and components for the PDF
    cve_dicts: list[dict] = []
    for item in items:
        deployments = await sx.get_affected_deployments(sx_db, item.cve_id, ns_list)
        components = await sx.get_affected_components(sx_db, item.cve_id, ns_list)

        cve_dicts.append({
            "cve_id": item.cve_id,
            "severity": item.severity.value if hasattr(item.severity, "value") else item.severity,
            "cvss": item.cvss,
            "epss_probability": item.epss_probability,
            "fixable": item.fixable,
            "fixed_by": item.fixed_by,
            "first_seen": item.first_seen,
            "published_on": item.published_on,
            "components": [
                {
                    "component_name": c.get("component_name", ""),
                    "component_version": c.get("component_version", ""),
                    "fixable": c.get("fixable", False),
                    "fixed_by": c.get("fixed_by"),
                }
                for c in components
            ],
            "deployments": [
                {
                    "deployment_name": d.get("deployment_name", ""),
                    "namespace": d.get("namespace", ""),
                    "cluster_name": d.get("cluster_name", ""),
                    "image_name": d.get("image_name", ""),
                }
                for d in deployments
            ],
            "priority_level": item.priority_level,
            "priority_deadline": item.priority_deadline,
            "risk_acceptance_status": item.risk_acceptance_status,
        })

    now = datetime.utcnow()
    pdf_metadata = {
        "username": current_user.username or current_user.email or current_user.id,
        "created_at": now,
        "filters": {
            "search": search,
            "severity": severity,
            "fixable": fixable,
            "prioritized_only": prioritized_only,
            "cvss_min": cvss_min,
            "epss_min": epss_min,
            "component": component,
            "risk_status": risk_status,
            "cluster": cluster,
            "namespace": namespace,
        },
    }
    pdf_bytes = generate_cve_pdf(cve_dicts, metadata=pdf_metadata)
    today = now.strftime("%Y-%m-%d")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cve-bericht-{today}.pdf"'},
    )


@router.get("/excel")
async def export_excel(
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
) -> Response:
    items = await fetch_filtered_cves(
        current_user, app_db, sx_db,
        search=search, severity=severity, fixable=fixable,
        prioritized_only=prioritized_only, sort_by=sort_by, sort_desc=sort_desc,
        cvss_min=cvss_min, epss_min=epss_min, component=component,
        risk_status=risk_status, cluster=cluster, namespace=namespace,
    )

    ns_list = await _resolve_namespaces(current_user, sx_db, cluster, namespace)

    # Build one row per CVE (no deployment/namespace/cluster duplication)
    excel_rows: list[dict] = []
    for item in items:
        components = await sx.get_affected_components(sx_db, item.cve_id, ns_list)
        deployments = await sx.get_affected_deployments(sx_db, item.cve_id, ns_list)

        comp_name = ""
        comp_version = ""
        if components:
            comp_name = components[0].get("component_name", "")
            comp_version = components[0].get("component_version", "")

        # Collect unique image names for summary
        image_names = sorted({d.get("image_name", "") for d in deployments if d.get("image_name")})
        image_summary = image_names[0] if len(image_names) == 1 else f"{image_names[0]} (+{len(image_names) - 1})" if image_names else ""

        excel_rows.append({
            "cve_id": item.cve_id,
            "severity": item.severity.value if hasattr(item.severity, "value") else item.severity,
            "cvss": item.cvss,
            "epss_probability": item.epss_probability,
            "component_name": comp_name,
            "component_version": comp_version,
            "fixable": item.fixable,
            "fixed_by": item.fixed_by,
            "image_name": image_summary,
            "first_seen": item.first_seen,
            "published_on": item.published_on,
            "priority_level": item.priority_level or "",
            "risk_acceptance_status": item.risk_acceptance_status or "",
        })

    xlsx_bytes = generate_cve_excel(excel_rows)
    today = datetime.utcnow().strftime("%Y-%m-%d")

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="cve-export-{today}.xlsx"'},
    )


@router.post("/excel/import")
async def import_excel(
    file: UploadFile,
    confirm: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> dict:
    # Only non-sec-team can import
    if current_user.is_sec_team:
        raise HTTPException(403, "Security-Team kann keine Risikoakzeptanzen importieren")
    if not current_user.has_namespaces:
        raise HTTPException(400, "Keine Namespaces zugeordnet")

    # Validate file size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, f"Datei zu groß (max. {MAX_UPLOAD_SIZE // (1024*1024)} MB)")

    # Parse
    try:
        parsed_rows = parse_import_excel(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if not parsed_rows:
        return {"items": [], "total_valid": 0, "total_invalid": 0}

    # Group by (cve_id, justification) to derive scope
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in parsed_rows:
        key = (row["cve_id"], row["justification"])
        groups[key].append(row)

    preview_items: list[dict] = []

    for (cve_id, justification), group_rows in groups.items():
        errors: list[str] = []

        # Validate CVE ID format
        if not cve_id or not cve_id.startswith("CVE-"):
            errors.append("Ungültige CVE-ID")

        # Validate justification length
        if len(justification) < 10:
            errors.append("Begründung zu kurz (min. 10 Zeichen)")
        elif len(justification) > 5000:
            errors.append("Begründung zu lang (max. 5000 Zeichen)")

        # Get expires_at from first row (all rows in group should have same)
        expires_at = group_rows[0].get("expires_at")

        # Determine scope: namespace scope from user's affected namespaces
        scope_summary = ""
        resolved_scope = None

        if not errors:
            try:
                deployments = await sx.get_affected_deployments(sx_db, cve_id, current_user.namespaces)
                if not deployments:
                    errors.append("CVE in Ihren Namespaces nicht gefunden")
                else:
                    # Always use namespace scope covering all affected namespaces
                    ns_set = {(d["cluster_name"], d["namespace"]) for d in deployments}
                    scope_targets = [
                        RiskScopeTarget(cluster_name=cl, namespace=ns)
                        for cl, ns in sorted(ns_set)
                    ]
                    resolved_scope = RiskScope(mode="namespace", targets=scope_targets)
                    scope_summary = f"namespace ({len(ns_set)} Namespace(s))"

                    # Validate scope against deployments
                    try:
                        resolved_scope = validate_and_resolve_scope(resolved_scope, deployments)
                    except HTTPException as e:
                        errors.append(str(e.detail))
                        resolved_scope = None

            except Exception as e:
                errors.append(f"Fehler: {str(e)}")

        valid = len(errors) == 0

        item = {
            "cve_id": cve_id,
            "justification": justification[:100] + ("..." if len(justification) > 100 else ""),
            "justification_full": justification,
            "scope": scope_summary,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "valid": valid,
            "errors": errors,
            "row_count": len(group_rows),
        }

        if resolved_scope:
            item["_resolved_scope"] = resolved_scope

        preview_items.append(item)

    total_valid = sum(1 for i in preview_items if i["valid"])
    total_invalid = sum(1 for i in preview_items if not i["valid"])

    if not confirm:
        # Preview mode — strip internal fields
        return {
            "items": [
                {k: v for k, v in item.items() if not k.startswith("_")}
                for item in preview_items
            ],
            "total_valid": total_valid,
            "total_invalid": total_invalid,
        }

    # Confirm mode — create risk acceptances
    created: list[dict] = []
    failed: list[dict] = []

    for item in preview_items:
        if not item["valid"]:
            failed.append({"cve_id": item["cve_id"], "error": "; ".join(item["errors"])})
            continue

        resolved_scope = item.get("_resolved_scope")
        if not resolved_scope:
            failed.append({"cve_id": item["cve_id"], "error": "Scope konnte nicht aufgelöst werden"})
            continue

        sk = scope_key(resolved_scope)

        # Check for existing active acceptance
        existing = await app_db.execute(
            select(RiskAcceptance).where(
                RiskAcceptance.cve_id == item["cve_id"],
                RiskAcceptance.scope_key == sk,
                RiskAcceptance.status.in_([RiskStatus.requested, RiskStatus.approved]),
            )
        )
        if existing.scalar_one_or_none():
            failed.append({
                "cve_id": item["cve_id"],
                "error": "Aktive Risikoakzeptanz für diesen Scope existiert bereits",
            })
            continue

        ra = RiskAcceptance(
            cve_id=item["cve_id"],
            status=RiskStatus.requested,
            justification=item["justification_full"],
            scope=resolved_scope.model_dump(mode="json"),
            scope_key=sk,
            expires_at=datetime.fromisoformat(item["expires_at"]) if item.get("expires_at") else None,
            created_by=current_user.id,
        )
        app_db.add(ra)
        await app_db.flush()

        await log_action(app_db, current_user.id, "risk_acceptance_imported", "risk_acceptance", str(ra.id))
        created.append({"cve_id": item["cve_id"], "ra_id": str(ra.id)})

    if created:
        await app_db.commit()

    logger.info(
        "Excel import by %s: %d created, %d failed",
        current_user.id, len(created), len(failed),
    )

    return {"created": created, "failed": failed}
