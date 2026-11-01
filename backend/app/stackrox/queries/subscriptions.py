from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..effective_scores import effective_score_params
from ._common import CVE_ROWS_CTE


async def get_subscription_locations(
    session: AsyncSession,
    cve_ids: list[str],
) -> list[dict]:
    """Per (CVE, namespace, cluster) state for the CVE subscription diff.

    One row per location with the effective scores (scope-independent, so the
    per-CVE max is the same for every subscriber), the distinct affected image
    pull specs, and the component names that have a fix there. Fixability is
    reported per component name, never through ``MAX(fixedby)``.
    """
    if not cve_ids:
        return []
    sql = text(f"""
        WITH {CVE_ROWS_CTE}
        SELECT ic.cvebaseinfo_cve AS cve_id,
               d.namespace,
               d.clustername AS cluster_name,
               MAX(ic.severity) AS severity,
               MAX(ic.cvss) AS cvss,
               MAX(ic.cvebaseinfo_epss_epssprobability) AS epss,
               COALESCE(
                   ARRAY_AGG(DISTINCT ic.image_name_fullname)
                       FILTER (WHERE ic.image_name_fullname IS NOT NULL),
                   ARRAY[]::text[]
               ) AS images,
               COALESCE(
                   ARRAY_AGG(DISTINCT comp.name)
                       FILTER (WHERE comp.name IS NOT NULL AND COALESCE(ic.isfixable, false)),
                   ARRAY[]::text[]
               ) AS fixable_components
        FROM deployments d
        JOIN cve_rows ic ON ic.deployments_id = d.id
        LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE ic.cvebaseinfo_cve = ANY(:cve_ids)
        GROUP BY ic.cvebaseinfo_cve, d.namespace, d.clustername
    """)
    result = await session.execute(sql, {"cve_ids": list(cve_ids), **await effective_score_params()})
    return [dict(row._mapping) for row in result]
