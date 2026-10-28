"""Scope-independent CVE scores, executed against a real PostgreSQL.

Each test builds a throwaway copy of the StackRox tables (tests/fixtures/
stackrox_min_schema.sql) inside one transaction that is rolled back afterwards,
seeds a small dual-namespace dataset, loads the effective-score map from it and
runs the real query functions. Skipped when no PostgreSQL is reachable at
STACKROX_TEST_DB_URL (default: the local dev app DB; nothing persists).

Dataset (namespaces team-a/tu and team-b/eu):
  img-stale  team-a, scanned 2026-10-01 (not rescanned since the feed update)
  img-fresh  team-b, scanned 2026-10-27
  img-twin   team-a, scanned 2026-10-27 (same instant as img-fresh)
  legacy     team-a, legacy model only (no v2 scan data)
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.stackrox import effective_scores
from app.stackrox import queries as sx

PG_URL = os.environ.get("STACKROX_TEST_DB_URL", "postgresql+asyncpg://postgres@localhost/rhacs_manager")
SCHEMA_SQL = (Path(__file__).parent / "fixtures" / "stackrox_min_schema.sql").read_text()

TEAM_A = [("team-a", "tu")]
TEAM_B = [("team-b", "eu")]
RED_HAT = 7
DEBIAN = 4

OLD_SCAN = datetime(2026, 10, 1, 8, 0)
NEW_SCAN = datetime(2026, 10, 27, 8, 0)

IMAGES = {
    # key: (images_v2.id, digest, scan time, has v2 scan data)
    "stale": ("v2-stale", "sha256:stale", OLD_SCAN, True),
    "fresh": ("v2-fresh", "sha256:fresh", NEW_SCAN, True),
    "twin": ("v2-twin", "sha256:twin", NEW_SCAN, True),
    "legacy": ("v2-legacy", "sha256:legacy", None, False),
}

DEPLOYMENTS = {
    # key: (namespace, cluster, image keys)
    "dep-a": ("team-a", "tu", ["stale", "twin", "legacy"]),
    "dep-b": ("team-b", "eu", ["fresh"]),
}

# (cve, image key, component, origin, severity, cvss, epss)
V2_ROWS = [
    # Stale 0.0 in team-a, fresh 8.1 in team-b (the reported bug).
    ("CVE-STALE", "stale", "openssl", RED_HAT, 4, 0.0, 0.5),
    ("CVE-STALE", "fresh", "openssl", RED_HAT, 4, 8.1, 0.5),
    # Feed lowered the score: old 8.1, fresh 5.0.
    ("CVE-DOWN", "stale", "curl", RED_HAT, 3, 8.1, 0.5),
    ("CVE-DOWN", "fresh", "curl", RED_HAT, 2, 5.0, 0.5),
    # Two rows tied at the newest scan time for the same component.
    ("CVE-TIE", "fresh", "libx", RED_HAT, 2, 6.7, 0.5),
    ("CVE-TIE", "twin", "libx", RED_HAT, 3, 7.8, 0.5),
    # Per-component key: the newest image only has stdlib (0.0); x/net (5.3) is
    # only on an older image and still current for that component.
    ("CVE-COMP", "stale", "golang.org/x/net", RED_HAT, 2, 5.3, 0.5),
    ("CVE-COMP", "fresh", "stdlib", RED_HAT, 1, 0.0, 0.5),
    # Two feeds.
    ("CVE-FEEDS", "stale", "zlib", RED_HAT, 3, 6.0, 0.5),
    ("CVE-FEEDS", "stale", "zlib", DEBIAN, 2, 7.2, 0.5),
    # Pre-4.11.6 row without a feed: not in the map, raw value stays.
    ("CVE-NULL", "stale", "bash", None, 4, 9.1, 0.5),
    # High CVSS, low EPSS.
    ("CVE-EPSS", "stale", "glibc", RED_HAT, 4, 9.0, 0.05),
    # Only in team-b.
    ("CVE-B-ONLY", "fresh", "openssl", RED_HAT, 4, 9.8, 0.9),
]

# Legacy-model row (image_cves_v2.imageid = digest): never in the map.
LEGACY_ROWS = [("CVE-LEGACY", "legacy", "sudo", RED_HAT, 3, 7.7, 0.5)]


async def _seed(session: AsyncSession) -> None:
    for key, (v2_id, digest, scanned, has_scan) in IMAGES.items():
        await session.execute(
            text(
                "INSERT INTO images_v2 (id, digest, name_fullname, scan_scantime, lastupdated, "
                "scanstats_componentcount) VALUES (:id, :digest, :name, :scanned, :scanned, :count)"
            ),
            {
                "id": v2_id,
                "digest": digest,
                "name": f"registry/{key}:1",
                "scanned": scanned,
                "count": 3 if has_scan else 0,
            },
        )
    for name, (namespace, cluster, image_keys) in DEPLOYMENTS.items():
        dep_id = uuid.uuid4()
        await session.execute(
            text("INSERT INTO deployments (id, name, namespace, clustername) VALUES (:id, :name, :ns, :cl)"),
            {"id": dep_id, "name": name, "ns": namespace, "cl": cluster},
        )
        for idx, key in enumerate(image_keys):
            v2_id, digest, _, _ = IMAGES[key]
            await session.execute(
                text(
                    "INSERT INTO deployments_containers (deployments_id, idx, image_id, image_idv2, "
                    "image_name_fullname) VALUES (:dep, :idx, :digest, :v2, :name)"
                ),
                {"dep": dep_id, "idx": idx, "digest": digest, "v2": v2_id, "name": f"registry/{key}:1"},
            )

    for legacy, rows in ((False, V2_ROWS), (True, LEGACY_ROWS)):
        for i, (cve, image_key, component, origin, severity, cvss, epss) in enumerate(rows):
            v2_id, digest, _, _ = IMAGES[image_key]
            comp_id = f"comp-{cve}-{image_key}-{component}-{origin}-{i}"
            await session.execute(
                text(
                    "INSERT INTO image_component_v2 (id, name, version, imageidv2, imageid) "
                    "VALUES (:id, :name, '1.0', :v2, :digest)"
                ),
                {"id": comp_id, "name": component, "v2": None if legacy else v2_id, "digest": digest},
            )
            await session.execute(
                text(
                    "INSERT INTO image_cves_v2 (id, imageid, imageidv2, cvebaseinfo_cve, severity, cvss, "
                    "cvebaseinfo_epss_epssprobability, origin, componentid, firstimageoccurrence, isfixable) "
                    "VALUES (:id, :imageid, :v2, :cve, :sev, :cvss, :epss, :origin, :comp, :seen, false)"
                ),
                {
                    "id": f"row-{comp_id}",
                    "imageid": digest if legacy else None,
                    "v2": None if legacy else v2_id,
                    "cve": cve,
                    "sev": severity,
                    "cvss": cvss,
                    "epss": epss,
                    "origin": origin,
                    "comp": comp_id,
                    "seen": OLD_SCAN,
                },
            )


@pytest.fixture
async def sx_session():
    engine = create_async_engine(PG_URL, poolclass=NullPool, connect_args={"timeout": 3})
    try:
        conn = await engine.connect()
    except Exception as exc:  # noqa: BLE001 - any connection problem means "no test database"
        await engine.dispose()
        pytest.skip(f"PostgreSQL not reachable at {PG_URL}: {exc}")
    schema = f"es_test_{uuid.uuid4().hex[:12]}"
    trans = await conn.begin()
    try:
        await conn.execute(text(f"CREATE SCHEMA {schema}"))
        await conn.execute(text(f"SET LOCAL search_path TO {schema}"))
        for statement in SCHEMA_SQL.split(";"):
            if "CREATE TABLE" in statement:
                await conn.execute(text(statement))
        session = AsyncSession(bind=conn)
        await _seed(session)
        await effective_scores.refresh_effective_scores(session)
        yield session
    finally:
        await trans.rollback()
        await conn.close()
        await engine.dispose()


def _by_id(rows: list[dict]) -> dict[str, dict]:
    return {r["cve_id"]: r for r in rows}


async def test_scoped_list_and_detail_use_fresh_score_from_other_namespace(sx_session):
    cves = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set()))
    assert float(cves["CVE-STALE"]["cvss"]) == 8.1

    detail = await sx.get_cve_detail(sx_session, "CVE-STALE", TEAM_A)
    assert float(detail["cvss"]) == 8.1


async def test_downward_correction_hides_cve_at_threshold(sx_session):
    visible = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set()))
    assert "CVE-DOWN" not in visible

    unfiltered = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 0.0, 0.0, set()))
    assert float(unfiltered["CVE-DOWN"]["cvss"]) == 5.0
    assert unfiltered["CVE-DOWN"]["severity"] == 2


async def test_rows_tied_at_newest_scan_take_max(sx_session):
    for scope in (TEAM_A, TEAM_B):
        cves = _by_id(await sx.get_cves_for_namespaces(sx_session, scope, 0.0, 0.0, set()))
        assert float(cves["CVE-TIE"]["cvss"]) == 7.8
        assert cves["CVE-TIE"]["severity"] == 3


async def test_component_is_part_of_freshness_key(sx_session):
    cves = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_B, 0.0, 0.0, set()))
    # Freshest image only has stdlib (0.0); x/net's latest rating (5.3) still counts.
    assert float(cves["CVE-COMP"]["cvss"]) == 5.3


async def test_multiple_feeds_cve_max_and_per_feed_ratings(sx_session):
    detail = await sx.get_cve_detail(sx_session, "CVE-FEEDS", TEAM_A)
    assert float(detail["cvss"]) == 7.2
    assert detail["severity"] == 3

    ratings = {r["origin_code"]: r for r in await sx.get_cve_origin_ratings(sx_session, "CVE-FEEDS", TEAM_A)}
    assert (ratings[RED_HAT]["severity"], float(ratings[RED_HAT]["cvss"])) == (3, 6.0)
    assert (ratings[DEBIAN]["severity"], float(ratings[DEBIAN]["cvss"])) == (2, 7.2)


async def test_origin_ratings_use_fresh_feed_score(sx_session):
    ratings = await sx.get_cve_origin_ratings(sx_session, "CVE-STALE", TEAM_A)
    assert [(r["origin_code"], float(r["cvss"])) for r in ratings] == [(RED_HAT, 8.1)]


async def test_null_origin_and_legacy_rows_keep_raw_scores(sx_session):
    cves = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 0.0, 0.0, set()))
    assert float(cves["CVE-NULL"]["cvss"]) == 9.1
    assert float(cves["CVE-LEGACY"]["cvss"]) == 7.7


async def test_thresholds_are_conjunctive_and_always_show_bypasses(sx_session):
    visible = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set()))
    assert "CVE-EPSS" not in visible

    bypass = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, {"CVE-EPSS", "CVE-DOWN"}))
    assert {"CVE-EPSS", "CVE-DOWN"} <= bypass.keys()


async def test_foreign_namespaces_never_change_membership_or_counts(sx_session):
    cves = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 0.0, 0.0, set()))
    assert "CVE-B-ONLY" not in cves
    assert cves.keys() == {
        "CVE-STALE",
        "CVE-DOWN",
        "CVE-TIE",
        "CVE-COMP",
        "CVE-FEEDS",
        "CVE-NULL",
        "CVE-EPSS",
        "CVE-LEGACY",
    }
    assert cves["CVE-STALE"]["affected_images"] == 1
    assert cves["CVE-STALE"]["affected_deployments"] == 1
    components = await sx.get_affected_components(sx_session, "CVE-STALE", TEAM_A)
    assert len(components) == 1


async def test_severity_distribution_sums_to_list_count(sx_session):
    cves = await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set())
    buckets = await sx.get_severity_distribution(sx_session, TEAM_A, 7.0, 0.1, set(), set())
    assert sum(b["count"] for b in buckets) == len(cves)
    by_severity = {b["severity"]: b["count"] for b in buckets}
    expected: dict[int, int] = {}
    for c in cves:
        expected[c["severity"]] = expected.get(c["severity"], 0) + 1
    assert by_severity == expected


async def test_escalation_job_query_matches_list_query(sx_session):
    """get_cves_by_namespace_detail (escalation/warning jobs) vs the preview's list query."""
    job = _by_id(await sx.get_cves_by_namespace_detail(sx_session, TEAM_A, 7.0, 0.1, set()))
    preview = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set()))
    assert job.keys() == preview.keys()
    for cve_id in job:
        assert float(job[cve_id]["cvss"]) == float(preview[cve_id]["cvss"])
        assert job[cve_id]["severity"] == preview[cve_id]["severity"]


async def test_image_views_use_effective_scores(sx_session):
    image_cves = _by_id(await sx.get_cves_for_image(sx_session, "sha256:stale", TEAM_A, 7.0, 0.1, set()))
    assert float(image_cves["CVE-STALE"]["cvss"]) == 8.1
    assert "CVE-DOWN" not in image_cves

    grouped = {g["image_id"]: g for g in await sx.get_cves_grouped_by_image(sx_session, TEAM_A, 7.0, 0.1, set())}
    list_ids = {c["cve_id"] for c in await sx.get_cves_for_namespaces(sx_session, TEAM_A, 7.0, 0.1, set())}
    stale_ids = {"CVE-STALE", "CVE-FEEDS", "CVE-NULL"}
    assert stale_ids <= list_ids
    assert grouped["sha256:stale"]["total_cves"] == len(stale_ids)


async def test_threshold_preview_matches_list(sx_session):
    preview = await sx.get_threshold_preview(sx_session, 7.0, 0.1)
    all_cves = await sx.get_all_cves(sx_session, 7.0, 0.1, set())
    assert preview["visible_cves"] == len(all_cves)


async def test_without_loaded_map_queries_use_raw_scores(sx_session):
    effective_scores.set_effective_scores([])
    cves = _by_id(await sx.get_cves_for_namespaces(sx_session, TEAM_A, 0.0, 0.0, set()))
    assert float(cves["CVE-STALE"]["cvss"]) == 0.0
    assert float(cves["CVE-DOWN"]["cvss"]) == 8.1


async def test_mttr_severity_uses_effective_severity(sx_session):
    info = await sx.get_cve_severity_and_first_seen(sx_session, ["CVE-DOWN", "CVE-NULL", "CVE-UNKNOWN"])
    # Raw MAX over CVE-DOWN rows is 3 (old scan); the freshest rating is 2.
    assert info["CVE-DOWN"] == (2, OLD_SCAN)
    # No map entry: raw severity.
    assert info["CVE-NULL"] == (4, OLD_SCAN)
    assert "CVE-UNKNOWN" not in info
