"""Verify the StackRox Central DB schema has every column the app's queries need.

The app supports ACS 4.11.6 and newer. Older Central DBs lack columns that the
shared ``CVE_ROWS_CTE`` selects, which would make nearly every StackRox query
fail. ``/ready`` and the startup log surface this explicitly instead.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

# (table, column, first ACS release that has it). When a query starts depending
# on a column introduced by a newer ACS release, add it here.
REQUIRED_STACKROX_COLUMNS: list[tuple[str, str, str]] = [
    ("image_cves_v2", "imageidv2", "4.11.0"),
    ("image_component_v2", "imageidv2", "4.11.0"),
    ("images_v2", "scanstats_componentcount", "4.11.0"),
    ("deployments_containers", "image_idv2", "4.11.0"),
    ("image_cves_v2", "origin", "4.11.6"),
]


def describe_missing(present: set[tuple[str, str]]) -> list[str]:
    """Return ``"table.column (ACS >= x)"`` for every required column not in ``present``."""
    return [
        f"{table}.{column} (ACS >= {since})"
        for table, column, since in REQUIRED_STACKROX_COLUMNS
        if (table, column) not in present
    ]


async def missing_stackrox_columns(conn: AsyncConnection) -> list[str]:
    """Query information_schema once and report required columns that are absent."""
    tables = sorted({table for table, _, _ in REQUIRED_STACKROX_COLUMNS})
    result = await conn.execute(
        text(
            "SELECT table_name, column_name FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = ANY(:tables)"
        ),
        {"tables": tables},
    )
    present = {(row.table_name, row.column_name) for row in result}
    # No logging here: /ready calls this on every kubelet probe. The startup probe logs.
    return describe_missing(present)
