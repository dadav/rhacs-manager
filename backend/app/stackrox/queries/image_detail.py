from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_image_metadata(
    session: AsyncSession,
    image_id: str,
) -> dict | None:
    """Fetch metadata for a single image from the images table."""
    sql = text("""
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
    result = await session.execute(sql, {"image_id": image_id})
    row = result.first()
    if row is None:
        return None
    return dict(row._mapping)


async def get_image_layers(
    session: AsyncSession,
    image_id: str,
) -> list[dict]:
    """Fetch Dockerfile layers for an image, ordered by index."""
    sql = text("""
        SELECT idx, instruction, value
        FROM images_layers
        WHERE images_id = :image_id
        ORDER BY idx
    """)
    result = await session.execute(sql, {"image_id": image_id})
    return [dict(row._mapping) for row in result]


async def get_image_cve_timeline(
    session: AsyncSession,
    image_id: str,
) -> list[dict]:
    """Aggregate CVE discoveries by month for a specific image.

    Groups by firstimageoccurrence month with severity buckets.
    """
    sql = text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', ic.firstimageoccurrence), 'YYYY-MM-DD') AS month,
            COUNT(*) FILTER (WHERE ic.severity = 4) AS critical,
            COUNT(*) FILTER (WHERE ic.severity = 3) AS important,
            COUNT(*) FILTER (WHERE ic.severity = 2) AS moderate,
            COUNT(*) FILTER (WHERE ic.severity <= 1) AS low
        FROM image_cves_v2 ic
        WHERE ic.imageid = :image_id
          AND ic.firstimageoccurrence IS NOT NULL
        GROUP BY DATE_TRUNC('month', ic.firstimageoccurrence)
        ORDER BY month
    """)
    result = await session.execute(sql, {"image_id": image_id})
    return [dict(row._mapping) for row in result]
