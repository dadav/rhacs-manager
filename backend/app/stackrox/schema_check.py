"""Verify the StackRox Central DB schema has every column the app's queries need.

The app supports ACS 4.11.6 and newer. Older Central DBs lack columns that the
shared ``CVE_ROWS_CTE`` selects, which would make nearly every StackRox query
fail. ``/ready`` and the startup log surface this explicitly instead.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

# Bounds connection acquisition plus the query, so a stalled DB can never block
# startup or a readiness probe.
SCHEMA_PROBE_TIMEOUT_SECONDS = 5.0

# (table, column, first ACS release that has it). When a query starts depending
# on a column introduced by a newer ACS release, add it here.
REQUIRED_STACKROX_COLUMNS: list[tuple[str, str, str]] = [
    ("image_cves_v2", "imageidv2", "4.11.0"),
    ("image_component_v2", "imageidv2", "4.11.0"),
    ("images_v2", "scanstats_componentcount", "4.11.0"),
    ("images_v2", "scan_scantime", "4.11.0"),
    ("deployments_containers", "image_idv2", "4.11.0"),
    ("image_cves_v2", "origin", "4.11.6"),
    # Cross-cluster namespace access (app/stackrox/namespace_access.py).
    ("namespaces", "name", "4.0.0"),
    ("namespaces", "clustername", "4.0.0"),
    ("namespaces", "annotations", "4.0.0"),
]


def describe_missing(present: set[tuple[str, str]]) -> list[str]:
    """Return ``"table.column (ACS >= x)"`` for every required column not in ``present``."""
    return [
        f"{table}.{column} (ACS >= {since})"
        for table, column, since in REQUIRED_STACKROX_COLUMNS
        if (table, column) not in present
    ]


async def missing_stackrox_columns(conn: AsyncConnection) -> list[str]:
    """Report required columns that are absent, resolving tables like the app's queries do.

    The app's SQL uses unqualified table names, so each table is resolved through the
    connection's search_path with ``to_regclass`` rather than assuming a schema. A table
    that does not resolve contributes no rows, so all of its columns count as missing.
    """
    tables = sorted({table for table, _, _ in REQUIRED_STACKROX_COLUMNS})
    result = await conn.execute(
        text(
            "SELECT t.name AS table_name, a.attname AS column_name "
            "FROM unnest(CAST(:tables AS text[])) AS t(name) "
            "JOIN pg_attribute a ON a.attrelid = to_regclass(t.name) "
            "WHERE a.attnum > 0 AND NOT a.attisdropped"
        ),
        {"tables": tables},
    )
    present = {(row.table_name, row.column_name) for row in result}
    # No logging here: /ready calls this on every kubelet probe. The startup probe logs.
    return describe_missing(present)


async def probe_stackrox_schema(engine: AsyncEngine, timeout_seconds: float) -> list[str]:
    """Connect and run ``missing_stackrox_columns`` within one time budget.

    Raises ``TimeoutError`` or the DB error; callers decide how to degrade.
    """
    async with asyncio.timeout(timeout_seconds):
        async with engine.connect() as conn:
            return await missing_stackrox_columns(conn)
