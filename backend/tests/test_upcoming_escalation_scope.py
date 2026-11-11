"""Scope contract of the upcoming-escalation preview.

``None`` means org-wide, an empty pair list means "nothing visible". A filter that
matches none of the caller's pairs must never widen to org-wide data.
"""

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.routers import escalations as router
from app.services import escalation_preview as svc
from tests.conftest import make_current_user

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
ORG_CVE = {
    "cve_id": "CVE-ORG",
    "severity": 4,
    "epss_probability": 0.5,
    "first_seen": datetime.utcnow() - timedelta(days=8),
    "fix_available_since": None,
}


def _app_db():
    db = AsyncMock()
    db.execute.side_effect = [[], [], [], []]
    return db


def _patch_stackrox(monkeypatch, calls):
    async def get_all_cves(sx_db, min_cvss, min_epss, always_show):
        calls.append("all")
        return [ORG_CVE]

    async def get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss, always_show):
        calls.append(("scoped", list(ns)))
        return [ORG_CVE]

    async def load_approved_suppression_rules(app_db):
        return [], []

    monkeypatch.setattr(svc.sx, "get_all_cves", get_all_cves)
    monkeypatch.setattr(svc.sx, "get_cves_for_namespaces", get_cves_for_namespaces)
    monkeypatch.setattr(svc, "load_approved_suppression_rules", load_approved_suppression_rules)


@pytest.mark.asyncio
async def test_empty_scope_returns_nothing_and_never_queries_org_wide(monkeypatch):
    calls: list = []
    _patch_stackrox(monkeypatch, calls)

    upcoming = await svc.compute_upcoming_escalations(AsyncMock(), _app_db(), [], SETTINGS)

    assert upcoming == []
    assert calls == []


@pytest.mark.asyncio
async def test_none_scope_is_org_wide(monkeypatch):
    calls: list = []
    _patch_stackrox(monkeypatch, calls)

    upcoming = await svc.compute_upcoming_escalations(AsyncMock(), _app_db(), None, SETTINGS)

    assert [u.cve_id for u in upcoming] == ["CVE-ORG"]
    assert calls == ["all"]


@pytest.mark.asyncio
async def test_team_member_filter_without_match_resolves_to_empty_scope():
    user = make_current_user(namespaces=[("a", "c1")])

    assert await router._upcoming_namespaces(user, AsyncMock(), None, "zzz") == []


@pytest.mark.asyncio
async def test_team_member_without_namespaces_resolves_to_empty_scope():
    user = make_current_user(namespaces=[])

    assert await router._upcoming_namespaces(user, AsyncMock(), None, None) == []


@pytest.mark.asyncio
async def test_sec_team_without_filter_is_org_wide():
    user = make_current_user(is_sec_team=True, has_all_namespaces=True, namespaces=[])

    assert await router._upcoming_namespaces(user, AsyncMock(), None, None) is None


@pytest.mark.asyncio
async def test_sec_team_filter_without_match_resolves_to_empty_scope(monkeypatch):
    from app.stackrox import queries as sx

    async def list_namespaces(sx_db):
        return [{"namespace": "a", "cluster_name": "c1"}]

    monkeypatch.setattr(sx, "list_namespaces", list_namespaces)
    user = make_current_user(is_sec_team=True, has_all_namespaces=True, namespaces=[])

    assert await router._upcoming_namespaces(user, AsyncMock(), None, "zzz") == []
