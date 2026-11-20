"""Scoped, feed-agnostic detail rows for PDF and Excel exports."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..effective_scores import effective_score_params
from ._common import CVE_ROWS_CTE, _namespace_filter


async def get_export_deployments(
    session: AsyncSession, cve_ids: list[str], namespaces: list[tuple[str, str]]
) -> dict[str, list[dict]]:
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT ic.cvebaseinfo_cve AS cve_id,
               d.id AS deployment_id, d.name AS deployment_name,
               d.namespace, d.clustername AS cluster_name,
               ic.image_name_fullname AS image_name, ic.image_id,
               MIN(ic.firstimageoccurrence) AS first_seen
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        WHERE {ns_fragment} AND ic.cvebaseinfo_cve = ANY(:cve_ids)
        GROUP BY ic.cvebaseinfo_cve, d.id, d.name, d.namespace, d.clustername,
                 ic.image_name_fullname, ic.image_id
        ORDER BY ic.cvebaseinfo_cve, d.namespace, d.name, d.id, ic.image_name_fullname, ic.image_id
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params, **await effective_score_params()})
    mapping: dict[str, list[dict]] = {}
    for row in result:
        data = dict(row._mapping)
        mapping.setdefault(data.pop("cve_id"), []).append(data)
    return mapping


async def get_export_components(
    session: AsyncSession, cve_ids: list[str], namespaces: list[tuple[str, str]]
) -> dict[str, list[dict]]:
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id,
               comp.name AS component_name, comp.version AS component_version,
               COALESCE(ic.isfixable, false) AS fixable, ic.fixedby AS fixed_by
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment} AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
        ORDER BY cve_id, component_name, component_version, fixable, fixed_by
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params, **await effective_score_params()})
    mapping: dict[str, list[dict]] = {}
    for row in result:
        data = dict(row._mapping)
        mapping.setdefault(data.pop("cve_id"), []).append(data)
    return mapping
