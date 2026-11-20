"""CVE export (PDF/Excel) and Excel import for batch risk acceptance creation."""

import logging
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..auth.middleware import CurrentUser, get_current_user
from ..deps import get_app_db, get_stackrox_db
from ..exports.excel_generator import parse_import_excel
from ..models.risk_acceptance import RiskAcceptance, RiskStatus
from ..schemas.cve import VulnOrigin
from ..schemas.risk_acceptance import RiskScope, RiskScopeTarget
from ..services import cve_subscription_service as sub_svc
from ..services.audit_service import log_action
from ..services.cve_alias_service import load_aliases
from ..services.cve_export_service import load_export_rows, resolve_export_namespaces
from ..services.risk_acceptance_service import is_single_team_scope, scope_key, validate_and_resolve_scope
from ..stackrox import queries as sx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exports", tags=["exports"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

# Localized error/status messages for the import endpoint
_IMPORT_MESSAGES: dict[str, dict[str, str]] = {
    "de": {
        "sec_team_forbidden": "Security-Team kann keine Risikoakzeptanzen importieren",
        "no_namespaces": "Keine Namespaces zugeordnet",
        "file_too_large": "Datei zu groß (max. {max_mb} MB)",
        "invalid_cve_id": "Ungültige CVE-ID",
        "justification_too_short": "Begründung zu kurz (min. 10 Zeichen)",
        "justification_too_long": "Begründung zu lang (max. 5000 Zeichen)",
        "cve_not_found": "CVE in Ihren Namespaces nicht gefunden",
        "scope_failed": "Scope konnte nicht aufgelöst werden",
        "duplicate_ra": "Aktive Risikoakzeptanz für diesen Scope existiert bereits",
        "namespace_label": "Namespace(s)",
        "error_prefix": "Fehler",
    },
    "en": {
        "sec_team_forbidden": "Security team cannot import risk acceptances",
        "no_namespaces": "No namespaces assigned",
        "file_too_large": "File too large (max. {max_mb} MB)",
        "invalid_cve_id": "Invalid CVE ID",
        "justification_too_short": "Justification too short (min. 10 characters)",
        "justification_too_long": "Justification too long (max. 5000 characters)",
        "cve_not_found": "CVE not found in your namespaces",
        "scope_failed": "Could not resolve scope",
        "duplicate_ra": "Active risk acceptance for this scope already exists",
        "namespace_label": "namespace(s)",
        "error_prefix": "Error",
    },
}


def _msg(lang: str) -> dict[str, str]:
    return _IMPORT_MESSAGES.get(lang, _IMPORT_MESSAGES["de"])


@router.get("/pdf")
async def export_pdf(
    request: Request,
    search: str | None = Query(None),
    severity: int | None = Query(None),
    fixable: bool | None = Query(None),
    prioritized_only: bool = Query(False),
    sort_by: str = Query("severity"),
    sort_desc: bool = Query(True),
    cvss_min: float | None = Query(None, ge=0, le=10),
    epss_min: float | None = Query(None, ge=0, le=1),
    component: str | None = Query(None),
    origin: VulnOrigin | None = Query(None),
    risk_status: str | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    age_min: int | None = Query(None, ge=0),
    age_max: int | None = Query(None, ge=0),
    deployment: str | None = Query(None),
    show_suppressed: bool = Query(False),
    remediation_status: str | None = Query(None),
    show_remediated: bool = Query(False),
    fix_overdue: bool = Query(False),
    deployment_id: str | None = Query(None),
    lang: str = Query("de"),
    ignore_thresholds: bool = Query(False),
    subscribed_only: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> Response:
    rows = await load_export_rows(
        current_user,
        app_db,
        sx_db,
        export_format="pdf",
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
        remediation_status=remediation_status,
        show_remediated=show_remediated,
        fix_overdue=fix_overdue,
        deployment_id=deployment_id,
        ignore_thresholds=ignore_thresholds,
        origin=origin,
        subscribed_only=subscribed_only,
    )

    now = datetime.utcnow()
    pdf_metadata = {
        "username": current_user.display_name or current_user.email or current_user.id,
        "created_at": now,
        "filters": {
            "search": search,
            "severity": severity,
            "fixable": fixable,
            "prioritized_only": prioritized_only,
            "cvss_min": cvss_min,
            "epss_min": epss_min,
            "component": component,
            "origin": origin.value if origin else None,
            "risk_status": risk_status,
            "cluster": cluster,
            "namespace": namespace,
        },
    }
    pdf_bytes = await run_in_threadpool(
        request.app.state.export_renderer.render, "pdf", rows, metadata=pdf_metadata, lang=lang
    )
    today = now.strftime("%Y-%m-%d")
    filename = "cve-report" if lang == "en" else "cve-bericht"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}-{today}.pdf"'},
    )


@router.get("/excel")
async def export_excel(
    request: Request,
    search: str | None = Query(None),
    severity: int | None = Query(None),
    fixable: bool | None = Query(None),
    prioritized_only: bool = Query(False),
    sort_by: str = Query("severity"),
    sort_desc: bool = Query(True),
    cvss_min: float | None = Query(None, ge=0, le=10),
    epss_min: float | None = Query(None, ge=0, le=1),
    component: str | None = Query(None),
    origin: VulnOrigin | None = Query(None),
    risk_status: str | None = Query(None),
    cluster: str | None = Query(None),
    namespace: str | None = Query(None),
    age_min: int | None = Query(None, ge=0),
    age_max: int | None = Query(None, ge=0),
    deployment: str | None = Query(None),
    show_suppressed: bool = Query(False),
    remediation_status: str | None = Query(None),
    show_remediated: bool = Query(False),
    fix_overdue: bool = Query(False),
    deployment_id: str | None = Query(None),
    lang: str = Query("de"),
    ignore_thresholds: bool = Query(False),
    subscribed_only: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> Response:
    rows = await load_export_rows(
        current_user,
        app_db,
        sx_db,
        export_format="excel",
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
        remediation_status=remediation_status,
        show_remediated=show_remediated,
        fix_overdue=fix_overdue,
        deployment_id=deployment_id,
        ignore_thresholds=ignore_thresholds,
        origin=origin,
        subscribed_only=subscribed_only,
    )

    xlsx_bytes = await run_in_threadpool(request.app.state.export_renderer.render, "excel", rows, lang=lang)
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
    lang: str = Query("de"),
    current_user: CurrentUser = Depends(get_current_user),
    app_db: AsyncSession = Depends(get_app_db),
    sx_db: AsyncSession = Depends(get_stackrox_db),
) -> dict:
    m = _msg(lang)

    # Only non-sec-team can import
    if current_user.is_sec_team:
        raise HTTPException(403, m["sec_team_forbidden"])
    if not current_user.has_namespaces:
        raise HTTPException(400, m["no_namespaces"])

    # Validate file size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(400, m["file_too_large"].format(max_mb=MAX_UPLOAD_SIZE // (1024 * 1024)))

    # Parse
    try:
        parsed_rows = parse_import_excel(content, lang)
    except ValueError as e:
        raise HTTPException(400, str(e)) from None

    if not parsed_rows:
        return {"items": [], "total_valid": 0, "total_invalid": 0}

    # Group by (cve_id, justification) to derive scope
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in parsed_rows:
        key = (row["cve_id"], row["justification"])
        groups[key].append(row)

    preview_items: list[dict] = []
    # Wildcard users carry no explicit pairs: resolve their visibility once.
    visible_pairs = await resolve_export_namespaces(current_user, sx_db)

    for (cve_id, justification), group_rows in groups.items():
        errors: list[str] = []

        # Validate CVE ID format
        if not cve_id or not cve_id.startswith("CVE-"):
            errors.append(m["invalid_cve_id"])

        # Validate justification length
        if len(justification) < 10:
            errors.append(m["justification_too_short"])
        elif len(justification) > 5000:
            errors.append(m["justification_too_long"])

        # Get expires_at from first row (all rows in group should have same)
        expires_at = group_rows[0].get("expires_at")

        # Determine scope: namespace scope from user's affected namespaces
        scope_summary = ""
        resolved_scope = None

        if not errors:
            try:
                deployments = await sx.get_affected_deployments(sx_db, cve_id, visible_pairs)
                if not deployments:
                    errors.append(m["cve_not_found"])
                else:
                    # Always use namespace scope covering all affected namespaces
                    ns_set = {(d["cluster_name"], d["namespace"]) for d in deployments}
                    scope_targets = [RiskScopeTarget(cluster_name=cl, namespace=ns) for cl, ns in sorted(ns_set)]
                    resolved_scope = RiskScope(mode="namespace", targets=scope_targets)
                    scope_summary = f"namespace ({len(ns_set)} {m['namespace_label']})"

                    # Validate scope against deployments
                    try:
                        resolved_scope = validate_and_resolve_scope(resolved_scope, deployments)
                    except HTTPException as e:
                        errors.append(str(e.detail))
                        resolved_scope = None

            except Exception as e:
                errors.append(f"{m['error_prefix']}: {str(e)}")

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

    aliases = await load_aliases(app_db, [item["cve_id"] for item in preview_items if item.get("_resolved_scope")])
    for item in preview_items:
        item["aliases"] = aliases.get(item["cve_id"], []) if item.get("_resolved_scope") else []

    total_valid = sum(1 for i in preview_items if i["valid"])
    total_invalid = sum(1 for i in preview_items if not i["valid"])

    if not confirm:
        # Preview mode — strip internal fields
        return {
            "items": [{k: v for k, v in item.items() if not k.startswith("_")} for item in preview_items],
            "total_valid": total_valid,
            "total_invalid": total_invalid,
        }

    # Confirm mode — create risk acceptances
    created: list[dict] = []
    failed: list[dict] = []

    for item in preview_items:
        if not item["valid"]:
            failed.append({"cve_id": item["cve_id"], "aliases": item["aliases"], "error": "; ".join(item["errors"])})
            continue

        resolved_scope = item.get("_resolved_scope")
        if not resolved_scope:
            failed.append({"cve_id": item["cve_id"], "aliases": item["aliases"], "error": m["scope_failed"]})
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
            failed.append(
                {
                    "cve_id": item["cve_id"],
                    "error": m["duplicate_ra"],
                    "aliases": item["aliases"],
                }
            )
            continue

        # Same rule as the create endpoint: single-team scopes auto-approve.
        single_team = is_single_team_scope(resolved_scope)

        ra = RiskAcceptance(
            cve_id=item["cve_id"],
            status=RiskStatus.approved if single_team else RiskStatus.requested,
            justification=item["justification_full"],
            scope=resolved_scope.model_dump(mode="json"),
            scope_key=sk,
            expires_at=datetime.fromisoformat(item["expires_at"]) if item.get("expires_at") else None,
            created_by=current_user.id,
            reviewed_at=datetime.utcnow() if single_team else None,
        )
        app_db.add(ra)
        await app_db.flush()

        await log_action(app_db, current_user.id, "risk_acceptance_imported", "risk_acceptance", str(ra.id))
        if single_team:
            await log_action(app_db, current_user.id, "risk_acceptance_auto_approved", "risk_acceptance", str(ra.id))
        await sub_svc.broadcast_subscription_event(
            app_db,
            sx_db,
            cve_id=ra.cve_id,
            kind="risk_acceptance",
            params={"status": ra.status.value},
            link=f"/risk-acceptances/{ra.id}",
            actor_id=current_user.id,
            scope=sub_svc.risk_acceptance_scope_pairs(ra.scope),
        )
        created.append({"cve_id": item["cve_id"], "aliases": item["aliases"], "ra_id": str(ra.id)})

    if created:
        await app_db.commit()

    logger.info(
        "Excel import by %s: %d created, %d failed",
        current_user.id,
        len(created),
        len(failed),
    )

    return {"created": created, "failed": failed}
