"""Read-only source snapshot for the ACS activity console collector.

One statement reads every deployment with its container image references and the
matching ``images_v2`` scan metadata, so the collector compares one consistent
moment. Never add a row limit: missing rows are interpreted as removals.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["ACTIVITY_SNAPSHOT_SQL", "get_activity_snapshot_rows"]

# LEFT JOINs keep deployments without containers and containers whose v2 image
# row has not arrived yet. No serialized protobufs, CVE, component or label rows.
ACTIVITY_SNAPSHOT_SQL = """
    SELECT d.id::text AS deployment_id,
           d.name AS deployment_name,
           d.namespace AS namespace,
           d.clustername AS cluster_name,
           dc.image_idv2 AS container_image_idv2,
           dc.image_id AS container_image_digest,
           dc.image_name_fullname AS container_image_name,
           iv.id AS image_id_v2,
           iv.digest AS image_digest,
           iv.name_fullname AS image_name,
           iv.scan_scantime AS scan_time,
           iv.scanstats_componentcount AS component_count,
           iv.scanstats_cvecount AS cve_count,
           iv.scanstats_fixablecvecount AS fixable_cve_count
    FROM deployments d
    LEFT JOIN deployments_containers dc ON dc.deployments_id = d.id
    LEFT JOIN images_v2 iv ON iv.id = dc.image_idv2
"""


async def get_activity_snapshot_rows(session: AsyncSession, statement_timeout_ms: int) -> list[dict]:
    """Return every snapshot row; raises on timeout or error (never a partial result).

    ``statement_timeout_ms`` bounds the query server-side in addition to the
    caller's client-side timeout, so a cancelled client never leaves work running.
    """
    await session.execute(text(f"SET LOCAL statement_timeout = {int(statement_timeout_ms)}"))
    result = await session.execute(text(ACTIVITY_SNAPSHOT_SQL))
    return [dict(row._mapping) for row in result]
