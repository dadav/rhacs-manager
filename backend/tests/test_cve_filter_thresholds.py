"""Threshold sourcing and bypass in fetch_filtered_cves (security-critical).

These rules gate which CVEs a user can see:
- Sec-team users bypass CVSS/EPSS thresholds entirely (min = 0).
- Non-sec users get the configured GlobalSettings thresholds.
- Prioritized CVEs and CVEs with an active risk acceptance are always shown
  (passed as the ``always_show`` bypass set to the StackRox query), regardless
  of thresholds.

The StackRox SQL layer enforces the actual conjunctive filtering; here we stub
it and assert the service passes the correct thresholds and bypass set.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.services.cve_filter_service as svc
from app.models.risk_acceptance import RiskStatus

from .conftest import make_current_user


def _result(*, scalar_one=None, all_items=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar_one
    r.scalars.return_value.all.return_value = all_items or []
    return r


def _app_db_with_calls(settings):
    """app_db whose execute() returns, in order: settings, priorities, RAs,
    suppression rules (none), remediations (none)."""
    priority = SimpleNamespace(cve_id="CVE-PRIO-1")
    ra = SimpleNamespace(cve_id="CVE-RA-1", status=RiskStatus.approved)
    db = AsyncMock()
    db.execute.side_effect = [
        _result(scalar_one=settings),  # GlobalSettings
        _result(all_items=[priority]),  # CvePriority
        _result(all_items=[ra]),  # RiskAcceptance
        _result(all_items=[]),  # SuppressionRule (_load_suppression_sets)
        _result(all_items=[]),  # Remediation (compute_remediation_status)
    ]
    return db


def _patch_stackrox(monkeypatch, captured):
    """Stub the StackRox query layer; record calls into ``captured``."""
    cve = {"cve_id": "CVE-LIST-1", "severity": 3, "cvss": 9.0, "epss_probability": 0.9}

    async def get_all_cves(sx_db, min_cvss, min_epss, always_show):
        captured["get_all_cves"] = (min_cvss, min_epss, set(always_show))
        return [cve]

    async def get_cves_for_namespaces(sx_db, ns, min_cvss, min_epss, always_show):
        captured["get_cves_for_namespaces"] = (min_cvss, min_epss, set(always_show))
        return [cve]

    async def list_namespaces(sx_db):
        return [{"namespace": "payments", "cluster_name": "cluster-a"}]

    async def get_cve_component_map(sx_db, cve_ids, ns):
        return {}

    async def get_cve_namespace_cluster_map(sx_db, cve_ids, ns):
        return {}

    monkeypatch.setattr(svc.sx, "get_all_cves", get_all_cves)
    monkeypatch.setattr(svc.sx, "get_cves_for_namespaces", get_cves_for_namespaces)
    monkeypatch.setattr(svc.sx, "list_namespaces", list_namespaces)
    monkeypatch.setattr(svc.sx, "get_cve_component_map", get_cve_component_map)
    monkeypatch.setattr(svc.sx, "get_cve_namespace_cluster_map", get_cve_namespace_cluster_map)


@pytest.mark.asyncio
async def test_non_sec_user_uses_configured_thresholds_and_bypass(monkeypatch):
    settings = SimpleNamespace(min_cvss_score=7.0, min_epss_score=0.5, fix_overdue_threshold_days=30)
    captured: dict = {}
    _patch_stackrox(monkeypatch, captured)
    user = make_current_user(is_sec_team=False, namespaces=[("payments", "cluster-a")])

    await svc.fetch_filtered_cves(user, _app_db_with_calls(settings), AsyncMock())

    min_cvss, min_epss, always_show = captured["get_cves_for_namespaces"]
    assert min_cvss == 7.0
    assert min_epss == 0.5
    # Prioritized + active-RA CVEs always bypass the thresholds.
    assert always_show == {"CVE-PRIO-1", "CVE-RA-1"}
    assert "get_all_cves" not in captured


@pytest.mark.asyncio
async def test_sec_team_user_bypasses_thresholds(monkeypatch):
    settings = SimpleNamespace(min_cvss_score=7.0, min_epss_score=0.5, fix_overdue_threshold_days=30)
    captured: dict = {}
    _patch_stackrox(monkeypatch, captured)
    user = make_current_user(is_sec_team=True, has_all_namespaces=True)

    await svc.fetch_filtered_cves(user, _app_db_with_calls(settings), AsyncMock())

    min_cvss, min_epss, always_show = captured["get_all_cves"]
    assert min_cvss == 0.0
    assert min_epss == 0.0
    assert always_show == {"CVE-PRIO-1", "CVE-RA-1"}
