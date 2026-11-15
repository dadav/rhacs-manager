"""Component placement keeps paths and fix versions tied to the visible image."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.stackrox.component_source import embedded_in, source_name
from app.stackrox.queries.core import get_cve_component_placements


@pytest.mark.parametrize(
    ("name", "location", "expected"),
    [
        ("org.yaml:snakeyaml", "camunda/javaagent/jmx_prometheus_javaagent.jar", "jmx_prometheus_javaagent.jar"),
        (
            "org.yaml:snakeyaml",
            "konsens/app/arc-claudia/libs/jruby-stdlib-9.3.8.0.jar:META-INF/jruby/snakeyaml-1.31.jar",
            "jruby-stdlib-9.3.8.0.jar",
        ),
        ("org.yaml:snakeyaml", "/libs/snakeyaml-1.31.jar", None),
        ("snakeyaml", "/libs/snakeyaml-bundle.jar:lib/snakeyaml.jar", "snakeyaml-bundle.jar"),
        ("openssl", "/var/lib/rpm", None),
        ("openssl", "", None),
        ("openssl", None, None),
    ],
)
def test_embedded_artifact(name, location, expected):
    assert embedded_in(name, location) == expected


@pytest.mark.parametrize(
    ("code", "name"),
    [
        (0, "os"),
        (1, "python"),
        (2, "java"),
        (3, "ruby"),
        (4, "nodejs"),
        (5, "dotnetcoreruntime"),
        (6, "infrastructure"),
        (7, "go"),
        (99, "other"),
        (None, "other"),
    ],
)
def test_verified_source_codes(code, name):
    assert source_name(code) == name


async def test_empty_scope_never_reads_stackrox():
    session = AsyncMock()
    assert await get_cve_component_placements(session, "CVE-1", []) == []
    session.execute.assert_not_awaited()


async def test_query_binds_scope_and_scores_and_picks_numeric_fix():
    session = AsyncMock()
    rows = [
        SimpleNamespace(
            _mapping={
                "image_name": "registry/image:1",
                "image_id": "image-1",
                "component_name": "org.yaml:snakeyaml",
                "component_version": "1.16",
                "location": "agent.jar",
                "source_code": 2,
                "fixable": True,
                "fixed_by_candidates": ["1.9", "1.10"],
                "probe_deployment_id": "dep-1",
            }
        )
    ]
    result = MagicMock()
    result.__iter__.side_effect = lambda: iter(rows)
    counts = MagicMock()
    counts.__iter__.side_effect = lambda: iter(
        [SimpleNamespace(image_id="image-1", location="agent.jar", cves_at_location=8)]
    )
    # Two statements: placements, then per-file CVE counts (never one CTE referenced twice).
    session.execute.side_effect = [result, counts]
    placements = await get_cve_component_placements(session, "CVE-1", [("team", "cluster")])
    assert placements[0]["fixed_by"] == "1.10"
    assert placements[0]["source"] == "java"
    assert placements[0]["embedded_in"] == "agent.jar"
    assert placements[0]["cves_at_location"] == 8
    assert "probe_deployment_id" not in placements[0]
    (sql, params), (counts_sql, counts_params) = [call.args for call in session.execute.await_args_list]
    assert "MAX(ic.fixedby)" not in str(sql)
    assert str(sql).count("cve_rows AS") == 1 and str(counts_sql).count("cve_rows AS") == 1
    assert "COUNT(DISTINCT ic.cvebaseinfo_cve)" in str(counts_sql)
    assert counts_params["os_source"] == 0
    assert counts_params["probe_deployment_ids"] == ["dep-1"]
    assert counts_params["locations"] == ["agent.jar"]
    assert "team" in params.values() and "cluster" in params.values()
    for bound in (params, counts_params):
        assert {"es_cve_ids", "es_severity", "es_cvss", "es_epss"} <= bound.keys()
