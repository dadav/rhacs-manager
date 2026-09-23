from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ._common import CVE_ROWS_CTE


async def get_team_alert_candidates(
    session: AsyncSession,
    min_cvss: float,
    min_epss: float,
    always_show_cve_ids: set[str],
) -> list[dict]:
    """Per-namespace CVEs visible to a thresholded team member.

    One row per (namespace, cluster, CVE) passing the same conjunctive CVSS/EPSS
    rule and always-show bypass as ``VISIBILITY_HAVING``. Suppression is NOT
    applied here: it depends on the namespace (scoped rules) and on the
    components present there, so each row carries ``components``
    (``[[name, version], ...]``) for the caller to evaluate per location.
    """
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT d.namespace,
               d.clustername AS cluster_name,
               ic.cvebaseinfo_cve AS cve_id,
               MAX(ic.severity) AS severity,
               COALESCE(
                   ARRAY_AGG(DISTINCT ARRAY[comp.name, COALESCE(comp.version, '')])
                       FILTER (WHERE comp.name IS NOT NULL),
                   ARRAY[]::text[][]
               ) AS components
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        GROUP BY d.namespace, d.clustername, ic.cvebaseinfo_cve
        HAVING (
            MAX(COALESCE(ic.cvss, 0)) >= :min_cvss
            AND MAX(COALESCE(ic.cvebaseinfo_epss_epssprobability, 0)) >= :min_epss
        )
        OR ic.cvebaseinfo_cve = ANY(:always_show)
    """)
    result = await session.execute(
        sql,
        {"min_cvss": min_cvss, "min_epss": min_epss, "always_show": list(always_show_cve_ids)},
    )
    return [dict(row._mapping) for row in result]
