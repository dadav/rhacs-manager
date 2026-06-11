"""Tests for the scheduler's remediation auto-resolve job.

Behavior under test: a remediation is auto-resolved when StackRox no longer
reports the CVE in that remediation's (namespace, cluster); remediations whose
CVE is still reported are left untouched. The StackRox query layer and both DB
session factories are stubbed so no real connections are needed.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.tasks.scheduler as scheduler
from app.models.remediation import Remediation, RemediationStatus


def _make_remediation(cve_id: str, namespace: str, status: RemediationStatus) -> Remediation:
    r = Remediation()
    r.cve_id = cve_id
    r.namespace = namespace
    r.cluster_name = "cluster-a"
    r.status = status
    r.resolved_at = None
    r.notes = None
    return r


def _session_factory_returning(remediations: list[Remediation]):
    """Build an AppSessionLocal-style factory whose execute() yields remediations."""
    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = remediations
    session.execute.return_value = result
    session.commit = AsyncMock()

    @asynccontextmanager
    async def factory():
        yield session

    return factory


def _noop_sx_factory():
    session = AsyncMock()

    @asynccontextmanager
    async def factory():
        yield session

    return factory


@pytest.mark.asyncio
async def test_auto_resolves_only_when_cve_no_longer_present(monkeypatch):
    # gone: CVE no longer in any deployment -> should resolve
    # still_present: CVE still reported -> should stay in_progress
    gone = _make_remediation("CVE-2024-0001", "payments", RemediationStatus.open)
    still_present = _make_remediation("CVE-2024-0002", "frontend", RemediationStatus.in_progress)

    monkeypatch.setattr(scheduler, "AppSessionLocal", _session_factory_returning([gone, still_present]))
    monkeypatch.setattr(scheduler, "StackRoxSessionLocal", _noop_sx_factory())

    async def fake_get_affected_deployments(sx_session, cve_id, namespaces):
        # gone CVE returns no deployments; the other still has one
        if cve_id == "CVE-2024-0001":
            return []
        return [{"deployment_id": "d1", "namespace": "frontend", "cluster_name": "cluster-a"}]

    monkeypatch.setattr(
        "app.stackrox.queries.get_affected_deployments",
        fake_get_affected_deployments,
    )

    await scheduler.run_remediation_auto_resolve()

    assert gone.status == RemediationStatus.resolved
    assert gone.resolved_at is not None
    assert still_present.status == RemediationStatus.in_progress
    assert still_present.resolved_at is None


@pytest.mark.asyncio
async def test_no_active_remediations_is_noop(monkeypatch):
    monkeypatch.setattr(scheduler, "AppSessionLocal", _session_factory_returning([]))
    sx_factory = _noop_sx_factory()
    monkeypatch.setattr(scheduler, "StackRoxSessionLocal", sx_factory)

    called = False

    async def fake_get_affected_deployments(*args, **kwargs):
        nonlocal called
        called = True
        return []

    monkeypatch.setattr(
        "app.stackrox.queries.get_affected_deployments",
        fake_get_affected_deployments,
    )

    # Should return early without touching StackRox.
    await scheduler.run_remediation_auto_resolve()
    assert called is False
