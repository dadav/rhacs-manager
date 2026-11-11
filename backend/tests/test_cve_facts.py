"""get_cve_facts: org-wide CVE-level facts with freshest-scan feed scores."""

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.stackrox import effective_scores
from app.stackrox import queries as sx


def _session(rows: list[dict]) -> AsyncMock:
    result = MagicMock()
    result.__iter__ = lambda self: iter([SimpleNamespace(_mapping=row) for row in rows])
    session = AsyncMock()
    session.execute.return_value = result
    return session


def _row(origin, severity, cvss, epss, impact=1.0, published=None, cve_id="CVE-1") -> dict:
    return {
        "cve_id": cve_id,
        "origin_code": origin,
        "severity": severity,
        "cvss": cvss,
        "epss_probability": epss,
        "impact_score": impact,
        "published_on": published,
    }


async def test_returns_none_without_rows():
    assert await sx.get_cve_facts(_session([]), "CVE-1") is None


async def test_feed_score_overrides_raw_and_max_across_feeds():
    # Feed 1 raw rows are stale (scored 9.8); the freshest scan rates it 5.0.
    effective_scores.set_effective_scores([{"cve_id": "CVE-1", "origin": 1, "severity": 2, "cvss": 5.0, "epss": 0.1}])
    rows = [
        _row(1, 4, 9.8, 0.9, impact=3.0, published=datetime(2024, 5, 1)),
        # No feed score known (NULL origin): raw values are kept.
        _row(None, 3, 7.5, 0.2, impact=6.0, published=datetime(2024, 1, 1)),
    ]

    facts = await sx.get_cve_facts(_session(rows), "CVE-1")

    assert facts == {
        "cve_id": "CVE-1",
        "severity": 3,
        "cvss": 7.5,
        "epss_probability": 0.2,
        "impact_score": 6.0,
        "published_on": datetime(2024, 1, 1),
    }


async def test_bulk_facts_keep_cves_separate_and_use_one_query():
    effective_scores.set_effective_scores([{"cve_id": "CVE-1", "origin": 1, "severity": 2, "cvss": 5.0, "epss": 0.1}])
    session = _session(
        [
            _row(1, 4, 9.8, 0.9),
            _row(None, 3, 7.5, 0.2, published=datetime(2024, 1, 1)),
            _row(1, 4, 9.9, 0.8, cve_id="CVE-2"),
        ]
    )
    facts = await sx.get_cve_facts_bulk(session, ["CVE-1", "CVE-2", "CVE-MISSING"])
    assert set(facts) == {"CVE-1", "CVE-2"}
    assert (facts["CVE-1"]["severity"], facts["CVE-1"]["cvss"]) == (3, 7.5)
    assert facts["CVE-1"]["published_on"] == datetime(2024, 1, 1)
    assert facts["CVE-2"]["cvss"] == 9.9
    assert facts["CVE-2"]["published_on"] is None
    session.execute.assert_awaited_once()
    sql, params = session.execute.await_args.args
    assert "GROUP BY ic.cvebaseinfo_cve, ic.origin" in str(sql)
    assert params == {"cve_ids": ["CVE-1", "CVE-2", "CVE-MISSING"]}


async def test_bulk_empty_input_does_not_query():
    session = _session([])
    assert await sx.get_cve_facts_bulk(session, []) == {}
    session.execute.assert_not_awaited()
