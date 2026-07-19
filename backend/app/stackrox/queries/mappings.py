from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import CVE_ROWS_CTE, _namespace_filter


async def list_namespaces(session: AsyncSession) -> list[dict]:
    sql = text("""
        SELECT DISTINCT namespace, clustername AS cluster_name
        FROM deployments
        ORDER BY clustername, namespace
    """)
    result = await session.execute(sql)
    return [dict(row._mapping) for row in result]


async def get_namespaces_with_cve(
    session: AsyncSession,
    cve_id: str,
) -> list[tuple[str, str]]:
    """All (namespace, cluster) pairs where a CVE is present — for sec team escalation."""
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT d.namespace, d.clustername
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        WHERE ic.cvebaseinfo_cve = :cve_id
    """)
    result = await session.execute(sql, {"cve_id": cve_id})
    return [(row.namespace, row.clustername) for row in result]


async def get_cve_namespace_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[str]]:
    """Returns {cve_id: [namespace, ...]} for the given CVEs within the given namespaces."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, d.namespace
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.namespace)
    return mapping


async def get_cve_namespace_cluster_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]] | None = None,
) -> dict[str, set[tuple[str, str]]]:
    """Returns {cve_id: {(cluster_name, namespace), ...}} for the given CVEs.

    If namespaces is None, returns data for all namespaces.
    """
    if not cve_ids:
        return {}
    if namespaces is not None and not namespaces:
        return {}

    ns_params: dict = {}
    if namespaces:
        ns_fragment, ns_params = _namespace_filter(namespaces)
        ns_filter = f"AND {ns_fragment}"
    else:
        ns_filter = ""

    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, d.clustername, d.namespace
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        WHERE ic.cvebaseinfo_cve = ANY(:cve_ids)
          {ns_filter}
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, set[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, set()).add((row.clustername, row.namespace))
    return mapping


async def get_cve_component_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[str]]:
    """Returns {cve_id: [component_name, ...]} for the given CVEs within the given namespaces."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id, comp.name AS component_name
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[str]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append(row.component_name)
    return mapping


async def get_cve_component_version_map(
    session: AsyncSession,
    cve_ids: list[str],
    namespaces: list[tuple[str, str]],
) -> dict[str, list[tuple[str, str]]]:
    """Returns {cve_id: [(component_name, component_version), ...]} for suppression rule matching."""
    if not cve_ids or not namespaces:
        return {}
    ns_fragment, ns_params = _namespace_filter(namespaces)
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            comp.name AS component_name,
            comp.version AS component_version
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE {ns_fragment}
          AND ic.cvebaseinfo_cve = ANY(:cve_ids)
          AND comp.name IS NOT NULL
    """)
    result = await session.execute(sql, {"cve_ids": cve_ids, **ns_params})
    mapping: dict[str, list[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append((row.component_name, row.component_version or ""))
    return mapping


async def get_all_deployed_cve_ids(session: AsyncSession) -> list[str]:
    """Return all distinct CVE IDs currently present in deployed images (global, no namespace filter)."""
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT ic.cvebaseinfo_cve AS cve_id
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
    """)
    result = await session.execute(sql)
    return [row.cve_id for row in result]


async def get_global_component_version_map(
    session: AsyncSession,
) -> dict[str, list[tuple[str, str]]]:
    """Return {cve_id: [(component_name, version), ...]} for all deployed CVEs (global, no namespace filter)."""
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT DISTINCT
            ic.cvebaseinfo_cve AS cve_id,
            comp.name AS component_name,
            comp.version AS component_version
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE comp.name IS NOT NULL
    """)
    result = await session.execute(sql)
    mapping: dict[str, list[tuple[str, str]]] = {}
    for row in result:
        mapping.setdefault(row.cve_id, []).append((row.component_name, row.component_version or ""))
    return mapping
