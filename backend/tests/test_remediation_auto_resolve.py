"""Tests for the scheduler's remediation auto-resolve job.

Behavior under test: a remediation is auto-resolved when StackRox no longer
reports the CVE in that remediation's (namespace, cluster); remediations whose
CVE is still reported are left untouched. The StackRox query layer and both DB
session factories are stubbed so no real connections are needed.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

import app.tasks.scheduler as scheduler
from app.models.audit_log import AuditLog
from app.models.remediation import Remediation, RemediationStatus


def _make_remediation(cve_id: str, namespace: str, status: RemediationStatus) -> Remediation:
    r = Remediation()
    r.id = uuid4()
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
    session.add = MagicMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = remediations
    session.execute.return_value = result
    session.commit = AsyncMock()

    @asynccontextmanager
    async def factory():
        yield session

    return factory, session


def _noop_sx_factory():
    session = AsyncMock()

    @asynccontextmanager
    async def factory():
        yield session

    return factory


@pytest.mark.asyncio
@pytest.mark.parametrize("notes", [None, "my note"])
async def test_auto_resolves_only_when_cve_no_longer_present(monkeypatch, notes):
    # gone: CVE no longer in any deployment -> should resolve
    # still_present: CVE still reported -> should stay in_progress
    gone = _make_remediation("CVE-2024-0001", "payments", RemediationStatus.open)
    gone.notes = notes
    still_present = _make_remediation("CVE-2024-0002", "frontend", RemediationStatus.in_progress)

    factory, session = _session_factory_returning([gone, still_present])
    monkeypatch.setattr(scheduler, "AppSessionLocal", factory)
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

    broadcast = AsyncMock(return_value=0)
    monkeypatch.setattr(scheduler.sub_svc, "broadcast_subscription_event", broadcast)

    await scheduler.run_remediation_auto_resolve()

    # Subscribers of the resolved CVE are told, scoped to that one location.
    broadcast.assert_awaited_once()
    kwargs = broadcast.await_args.kwargs
    assert kwargs["cve_id"] == "CVE-2024-0001"
    assert kwargs["kind"] == "remediation"
    assert kwargs["scope"] == [("payments", "cluster-a")]

    assert gone.status == RemediationStatus.resolved
    assert gone.resolved_at is not None
    assert gone.notes == notes
    assert gone.resolved_by is None
    session.add.assert_called_once()
    audit = session.add.call_args.args[0]
    assert isinstance(audit, AuditLog)
    assert audit.action == "remediation_auto_resolved"
    assert audit.user_id is None
    assert audit.entity_type == "remediation"
    assert audit.entity_id == str(gone.id)
    assert audit.details == {"old_status": "open", "new_status": "resolved"}
    session.flush.assert_awaited_once()
    session.commit.assert_awaited_once()
    assert still_present.status == RemediationStatus.in_progress
    assert still_present.resolved_at is None


@pytest.mark.asyncio
async def test_no_active_remediations_is_noop(monkeypatch):
    factory, session = _session_factory_returning([])
    monkeypatch.setattr(scheduler, "AppSessionLocal", factory)
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
    session.add.assert_not_called()
