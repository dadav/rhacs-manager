"""Image detail queries.

`image_id` is always a sha256 digest (the app-facing image key). In the ACS 4.11
dual model that maps to `images.id` (legacy, frozen at the upgrade) and to
`images_v2.digest` (current). Note `images_v2.digest` is NOT unique — the same
digest can appear under several pull specs — so every lookup picks a single row
with ORDER BY ... LIMIT 1, preferring the row that actually carries scan data.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Picks the one images_v2 row to use for a digest: prefer a row with scan data,
# then the most recently updated. COALESCE keeps a NULL count from sorting first
# (ORDER BY ... DESC is NULLS FIRST in PostgreSQL).
_V2_IMAGE_PICK = """
    SELECT id FROM images_v2
    WHERE digest = :image_id
    ORDER BY (COALESCE(scanstats_componentcount, 0) > 0) DESC, lastupdated DESC
    LIMIT 1
"""


async def get_image_metadata(
    session: AsyncSession,
    image_id: str,
) -> dict | None:
    """Fetch metadata for a single image, preferring the v2 model.

    Falls back to the legacy `images` table when the v2 row has no scan data
    (scanstats_componentcount = 0), which is where the frozen legacy CVE rows
    still apply. Key names match the legacy shape so callers stay unchanged.
    """
    v2_sql = text("""
        SELECT
            digest                              AS id,
            name_registry,
            name_remote,
            name_tag,
            name_fullname,
            metadata_v1_created,
            metadata_v1_user,
            scan_scantime,
            scan_operatingsystem,
            scanstats_componentcount            AS components,
            scanstats_cvecount                  AS cves,
            scanstats_fixablecvecount           AS fixablecves,
            lastupdated,
            riskscore,
            topcvss
        FROM images_v2
        WHERE digest = :image_id
        ORDER BY (COALESCE(scanstats_componentcount, 0) > 0) DESC, lastupdated DESC
        LIMIT 1
    """)
    legacy_sql = text("""
        SELECT
            id,
            name_registry,
            name_remote,
            name_tag,
            name_fullname,
            metadata_v1_created,
            metadata_v1_user,
            scan_scantime,
            scan_operatingsystem,
            components,
            cves,
            fixablecves,
            lastupdated,
            riskscore,
            topcvss
        FROM images
        WHERE id = :image_id
    """)

    v2_row = (await session.execute(v2_sql, {"image_id": image_id})).first()
    if v2_row is not None and (v2_row._mapping["components"] or 0) > 0:
        return dict(v2_row._mapping)

    legacy_row = (await session.execute(legacy_sql, {"image_id": image_id})).first()
    if legacy_row is not None:
        return dict(legacy_row._mapping)

    # Only metadata (no scan data) exists, or nothing at all.
    return dict(v2_row._mapping) if v2_row is not None else None


async def get_image_layers(
    session: AsyncSession,
    image_id: str,
) -> list[dict]:
    """Fetch Dockerfile layers for an image, ordered by index. Prefers the v2 model."""
    v2_sql = text(f"""
        SELECT l.idx, l.instruction, l.value
        FROM images_v2_layers l
        WHERE l.images_v2_id IN ({_V2_IMAGE_PICK})
        ORDER BY l.idx
    """)
    legacy_sql = text("""
        SELECT idx, instruction, value
        FROM images_layers
        WHERE images_id = :image_id
        ORDER BY idx
    """)

    result = await session.execute(v2_sql, {"image_id": image_id})
    rows = [dict(row._mapping) for row in result]
    if rows:
        return rows

    result = await session.execute(legacy_sql, {"image_id": image_id})
    return [dict(row._mapping) for row in result]


async def get_image_cve_timeline(
    session: AsyncSession,
    image_id: str,
) -> list[dict]:
    """Aggregate CVE discoveries by month for a specific image.

    Groups by firstimageoccurrence month with severity buckets. Reads exactly one
    model — v2 rows if the image has v2 scan data, otherwise the frozen legacy
    rows — so the COUNT(*) buckets cannot double-count across models.
    """
    sql = text("""
        WITH v2img AS (
            SELECT id FROM images_v2
            WHERE digest = :image_id
              AND scanstats_componentcount > 0
            ORDER BY lastupdated DESC
            LIMIT 1
        )
        SELECT
            TO_CHAR(DATE_TRUNC('month', ic.firstimageoccurrence), 'YYYY-MM-DD') AS month,
            COUNT(*) FILTER (WHERE ic.severity = 4) AS critical,
            COUNT(*) FILTER (WHERE ic.severity = 3) AS important,
            COUNT(*) FILTER (WHERE ic.severity = 2) AS moderate,
            COUNT(*) FILTER (WHERE ic.severity <= 1) AS low
        FROM image_cves_v2 ic
        WHERE (
                ic.imageidv2 IN (SELECT id FROM v2img)
                OR (ic.imageid = :image_id AND NOT EXISTS (SELECT 1 FROM v2img))
              )
          AND ic.firstimageoccurrence IS NOT NULL
        GROUP BY DATE_TRUNC('month', ic.firstimageoccurrence)
        ORDER BY month
    """)
    result = await session.execute(sql, {"image_id": image_id})
    return [dict(row._mapping) for row in result]
