"""Load export data before rendering, without retaining database connections."""

import logging
from threading import Lock
from time import perf_counter
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.middleware import CurrentUser
from ..exports.excel_generator import generate_cve_excel
from ..exports.pdf_generator import generate_cve_pdf
from ..i18n import ApiError
from ..routers._scope import narrow_namespaces
from ..stackrox import queries as sx
from .cve_filter_service import fetch_filtered_cves

logger = logging.getLogger(__name__)
ExportFormat = Literal["pdf", "excel"]


def unique_image_names(deployments: list[dict]) -> list[str]:
    return sorted({d["image_name"] for d in deployments if d.get("image_name")})


def unique_component_labels(components: list[dict]) -> list[str]:
    """Collapse feed/fix variants of the same component name and version."""
    return sorted(
        {
            f"{c.get('component_name') or ''} {c.get('component_version') or ''}".strip()
            for c in components
            if c.get("component_name")
        }
    )


async def resolve_export_namespaces(
    current_user: CurrentUser,
    sx_db: AsyncSession,
    cluster: str | None = None,
    namespace: str | None = None,
) -> list[tuple[str, str]]:
    if current_user.can_see_all_namespaces:
        all_ns = await sx.list_namespaces(sx_db)
        namespaces = [(r["namespace"], r["cluster_name"]) for r in all_ns]
    else:
        namespaces = list(current_user.namespaces)
    return narrow_namespaces(namespaces, cluster, namespace)


async def load_export_rows(
    current_user: CurrentUser,
    app_db: AsyncSession,
    sx_db: AsyncSession,
    *,
    export_format: ExportFormat,
    **filters,
) -> list[dict]:
    context = {
        "format": export_format,
        "user_id": current_user.id,
        "cluster": filters.get("cluster"),
        "namespace": filters.get("namespace"),
        "ignore_thresholds": filters.get("ignore_thresholds", False),
    }
    stage = "selection"
    started = perf_counter()
    try:
        items = await fetch_filtered_cves(current_user, app_db, sx_db, **filters)
        selection_seconds = perf_counter() - started
        context["cve_count"] = len(items)
        stage = "details"
        detail_start = perf_counter()
        deployments, components = {}, {}
        if items:
            namespaces = await resolve_export_namespaces(
                current_user, sx_db, filters.get("cluster"), filters.get("namespace")
            )
            cve_ids = [item.cve_id for item in items]
            # An AsyncSession owns one connection; execute both queries sequentially.
            deployments = await sx.get_export_deployments(sx_db, cve_ids, namespaces)
            components = await sx.get_export_components(sx_db, cve_ids, namespaces)
        rows = [
            {
                "cve_id": item.cve_id,
                "severity": item.severity.value,
                "cvss": item.cvss,
                "epss_probability": item.epss_probability,
                "fixable": item.fixable,
                "fixed_by": item.fixed_by,
                "first_seen": item.first_seen,
                "published_on": item.published_on,
                "priority_level": item.priority_level,
                "priority_deadline": item.priority_deadline,
                "risk_acceptance_status": item.risk_acceptance_status,
                "components": components.get(item.cve_id, []),
                "deployments": deployments.get(item.cve_id, []),
            }
            for item in items
        ]
        logger.info(
            "export_data_loaded",
            extra={
                **context,
                "selection_seconds": round(selection_seconds, 3),
                "detail_seconds": round(perf_counter() - detail_start, 3),
            },
        )
        return rows
    except Exception:
        logger.exception("export_failed", extra={**context, "stage": stage})
        raise
    finally:
        # Neither renderer needs ORM objects. Return connections even on failure.
        try:
            await sx_db.close()
        finally:
            await app_db.close()


class ExportRenderer:
    """One instance per app process; the worker owns the PDF slot until it exits."""

    def __init__(self):
        self._pdf_lock = Lock()

    def render(
        self, export_format: ExportFormat, rows: list[dict], *, lang: str, metadata: dict | None = None
    ) -> bytes:
        # Acquire inside the worker: cancelling the request cannot release a slot
        # while its non-cancellable PDF generator is still running.
        if export_format == "pdf" and not self._pdf_lock.acquire(blocking=False):
            logger.info("export_busy", extra={"format": export_format})
            raise ApiError(503, "pdf_export_busy")
        started = perf_counter()
        context = {"format": export_format, "cve_count": len(rows), "stage": "render"}
        try:
            if export_format == "pdf":
                content = generate_cve_pdf(rows, metadata=metadata, lang=lang)
            else:
                excel_rows = [
                    {
                        **row,
                        "components": unique_component_labels(row["components"]),
                        "image_names": unique_image_names(row["deployments"]),
                        "priority_level": row["priority_level"] or "",
                        "risk_acceptance_status": row["risk_acceptance_status"] or "",
                    }
                    for row in rows
                ]
                content = generate_cve_excel(excel_rows, lang=lang)
            logger.info(
                "export_rendered",
                extra={
                    **context,
                    "render_seconds": round(perf_counter() - started, 3),
                    "bytes": len(content),
                },
            )
            return content
        except Exception:
            logger.exception("export_failed", extra=context)
            raise
        finally:
            if export_format == "pdf":
                self._pdf_lock.release()
