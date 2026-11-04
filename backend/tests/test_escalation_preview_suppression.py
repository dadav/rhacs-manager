"""The upcoming-escalation preview must skip CVEs the scheduler will not escalate
because approved suppression rules hide every location in scope."""

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services import escalation_preview as svc

RULE = {
    "severity_min": 0,
    "epss_threshold": 0.0,
    "days_to_level1": 10,
    "days_to_level2": 20,
    "days_to_level3": 30,
}
SETTINGS = SimpleNamespace(
    escalation_rules=[RULE],
    escalation_warning_days=7,
    min_cvss_score=None,
    min_epss_score=None,
)
TEAM = [("a", "c1"), ("b", "c1")]


def _app_db():
    """execute() results in call order: approved RAs, priorities, requested RAs, escalations."""
    db = AsyncMock()
    db.execute.side_effect = [[], [], [], []]
    return db


def _cve(cve_id):
    # Level 1 falls due in ~2 days: inside the 7-day warning window.
    return {
        "cve_id": cve_id,
        "severity": 4,
        "epss_probability": 0.5,
        "first_seen": datetime.utcnow() - timedelta(days=8),
        "fix_available_since": None,
    }


def _patch(monkeypatch, *, cve_rules, component_rules, captured):
    async def get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss, always_show):
        return [_cve("CVE-COVERED"), _cve("CVE-PARTIAL"), _cve("CVE-FREE")]

    async def get_cves_by_namespace_detail(sx_db, ns, min_cvss, min_epss, always_show):
        captured["detail_namespaces"] = list(ns)
        return [
            {**_cve(cve_id), "namespace": namespace, "cluster_name": cluster, "components": []}
            for cve_id in ("CVE-COVERED", "CVE-PARTIAL", "CVE-FREE")
            for namespace, cluster in ns
        ]

    async def load_approved_suppression_rules(app_db):
        return cve_rules, component_rules

    monkeypatch.setattr(svc.sx, "get_cves_for_namespaces", get_cves_for_namespaces)
    monkeypatch.setattr(svc.sx, "get_cves_by_namespace_detail", get_cves_by_namespace_detail)
    monkeypatch.setattr(svc, "load_approved_suppression_rules", load_approved_suppression_rules)


def _scoped_rule(cve_id, pairs):
    targets = [{"namespace": ns, "cluster_name": cluster} for ns, cluster in pairs]
    return SimpleNamespace(cve_id=cve_id, scope={"mode": "namespace", "targets": targets})


@pytest.mark.asyncio
async def test_fully_covered_cve_is_not_upcoming_but_partly_covered_is(monkeypatch):
    captured: dict = {}
    rules = [_scoped_rule("CVE-COVERED", TEAM), _scoped_rule("CVE-PARTIAL", [("a", "c1")])]
    _patch(monkeypatch, cve_rules=rules, component_rules=[], captured=captured)

    upcoming = await svc.compute_upcoming_escalations(AsyncMock(), _app_db(), TEAM, SETTINGS)

    assert sorted(u.cve_id for u in upcoming) == ["CVE-FREE", "CVE-PARTIAL"]
    assert captured["detail_namespaces"] == TEAM


@pytest.mark.asyncio
async def test_no_rules_skips_the_per_location_query(monkeypatch):
    captured: dict = {}
    _patch(monkeypatch, cve_rules=[], component_rules=[], captured=captured)

    upcoming = await svc.compute_upcoming_escalations(AsyncMock(), _app_db(), TEAM, SETTINGS)

    assert sorted(u.cve_id for u in upcoming) == ["CVE-COVERED", "CVE-FREE", "CVE-PARTIAL"]
    assert "detail_namespaces" not in captured


@pytest.mark.asyncio
async def test_deadline_comes_from_unsuppressed_locations_only(monkeypatch):
    """Suppressed location a@c1 is 12 days old (level 1 overdue, level 2 beyond the
    window); unsuppressed b@c1 is 5 days old, so level 1 is due in ~5 days."""
    now = datetime.utcnow()

    async def get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss, always_show):
        return [{**_cve("CVE-MIXED"), "first_seen": now - timedelta(days=12)}]

    async def get_cves_by_namespace_detail(sx_db, ns, min_cvss, min_epss, always_show):
        return [
            {
                "cve_id": "CVE-MIXED",
                "namespace": "a",
                "cluster_name": "c1",
                "components": [],
                "first_seen": now - timedelta(days=12),
                "fix_available_since": None,
            },
            {
                "cve_id": "CVE-MIXED",
                "namespace": "b",
                "cluster_name": "c1",
                "components": [],
                "first_seen": now - timedelta(days=5),
                "fix_available_since": None,
            },
        ]

    async def load_approved_suppression_rules(app_db):
        return [_scoped_rule("CVE-MIXED", [("a", "c1")])], []

    monkeypatch.setattr(svc.sx, "get_cves_for_namespaces", get_cves_for_namespaces)
    monkeypatch.setattr(svc.sx, "get_cves_by_namespace_detail", get_cves_by_namespace_detail)
    monkeypatch.setattr(svc, "load_approved_suppression_rules", load_approved_suppression_rules)

    upcoming = await svc.compute_upcoming_escalations(AsyncMock(), _app_db(), TEAM, SETTINGS)

    assert len(upcoming) == 1
    assert upcoming[0].next_level == 1
    assert upcoming[0].days_until_escalation in (4, 5)
    assert upcoming[0].current_age_days == 5
