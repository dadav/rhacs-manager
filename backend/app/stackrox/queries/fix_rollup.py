from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import CVE_ROWS_CTE, _namespace_filter


async def get_component_cve_rows(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]] | None,
    *,
    image_id: str | None = None,
    deployment_name: str | None = None,
    deployment_id: str | None = None,
) -> list[dict]:
    """One row per (component name, version, OS, CVE) for the given CVEs.

    Each row carries the distinct fix versions reported for that pair plus the
    images, deployments, and namespaces where it occurs. ``image_pairs`` holds
    ``[image_id, image_name]`` pairs aggregated together, so an ID is never
    matched with another image's name. ``namespaces=None`` means
    org-wide (no namespace filter); an empty list returns nothing. CVE rows whose
    component is unknown (no ``image_component_v2`` match) are skipped.

    The caller decides which CVEs are visible (thresholds, suppression, filters)
    and aggregates the rows per component; this query only maps CVEs to components.
    """
    if not cve_ids or namespaces == []:
        return []
    params: dict = {"cve_ids": cve_ids}
    where = ["ic.cvebaseinfo_cve = ANY(:cve_ids)", "comp.name IS NOT NULL"]
    if namespaces is not None:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        where.append(ns_fragment)
        params.update(ns_params)
    if image_id:
        where.append("ic.image_id = :image_id")
        params["image_id"] = image_id
    if deployment_name:
        where.append("d.name = :deployment_name")
        params["deployment_name"] = deployment_name
    if deployment_id:
        where.append("d.id = :deployment_id")
        params["deployment_id"] = deployment_id
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT
            comp.name                                             AS component_name,
            COALESCE(comp.version, '')                            AS component_version,
            COALESCE(comp.operatingsystem, '')                    AS operating_system,
            ic.cvebaseinfo_cve                                    AS cve_id,
            BOOL_OR(COALESCE(ic.isfixable, false))                AS fixable,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(ic.fixedby, '')), NULL) AS fixed_by_versions,
            ARRAY_AGG(DISTINCT ARRAY[ic.image_id, COALESCE(ic.image_name_fullname, '')]) AS image_pairs,
            ARRAY_AGG(DISTINCT d.id)                              AS deployment_ids,
            ARRAY_AGG(DISTINCT d.clustername || '/' || d.namespace) AS namespaces
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {" AND ".join(where)}
        GROUP BY comp.name, comp.version, comp.operatingsystem, ic.cvebaseinfo_cve
        ORDER BY component_name, component_version, operating_system, cve_id
    """)
    result = await session.execute(sql, params)
    return [dict(row._mapping) for row in result]


async def get_image_namespaces(session: AsyncSession, image_id: str) -> list[tuple[str, str]]:
    """(namespace, cluster) pairs of the deployments running the image with this digest."""
    sql = text("""
        SELECT DISTINCT d.namespace, d.clustername
        FROM deployments d
        JOIN deployments_containers dc ON dc.deployments_id = d.id
        WHERE dc.image_id = :image_id
    """)
    result = await session.execute(sql, {"image_id": image_id})
    return [(row.namespace, row.clustername) for row in result]


async def get_deployment_namespaces(session: AsyncSession, deployment_id: str) -> list[tuple[str, str]]:
    """(namespace, cluster) of the deployment with this ID (empty if unknown)."""
    sql = text("SELECT namespace, clustername FROM deployments WHERE id = :deployment_id")
    result = await session.execute(sql, {"deployment_id": deployment_id})
    return [(row.namespace, row.clustername) for row in result]
