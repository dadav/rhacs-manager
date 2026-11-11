"""The dashboard risk-acceptance pipeline is scoped like stat_open_risk_acceptances."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.risk_acceptance import RiskStatus
from app.routers import dashboard
from tests.conftest import make_current_user


def _ra(status: RiskStatus, namespace: str, created_by: str = "someone-else") -> SimpleNamespace:
    scope = {"mode": "namespace", "targets": [{"cluster_name": "cluster-a", "namespace": namespace}]}
    return SimpleNamespace(status=status, scope=scope, created_by=created_by)


def _session_returning(rows: list) -> MagicMock:
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows
    session = AsyncMock()
    session.execute.return_value = result
    factory = MagicMock()
    factory.return_value.__aenter__ = AsyncMock(return_value=session)
    factory.return_value.__aexit__ = AsyncMock(return_value=False)
    return factory


ROWS = [
    _ra(RiskStatus.requested, "payments"),
    _ra(RiskStatus.requested, "foreign"),
    _ra(RiskStatus.approved, "foreign"),
    _ra(RiskStatus.rejected, "foreign", created_by="test-user-1"),
]


@pytest.mark.asyncio
async def test_team_member_counts_only_accessible_risk_acceptances(monkeypatch):
    monkeypatch.setattr(dashboard, "AppSessionLocal", _session_returning(ROWS))
    user = make_current_user(namespaces=[("payments", "cluster-a")])

    pipeline = await dashboard._ra_pipeline(user)

    assert (pipeline.requested, pipeline.approved, pipeline.rejected, pipeline.expired) == (1, 0, 1, 0)


@pytest.mark.asyncio
async def test_sec_team_counts_every_risk_acceptance(monkeypatch):
    monkeypatch.setattr(dashboard, "AppSessionLocal", _session_returning(ROWS))
    user = make_current_user(is_sec_team=True, has_all_namespaces=True, namespaces=[])

    pipeline = await dashboard._ra_pipeline(user)

    assert (pipeline.requested, pipeline.approved, pipeline.rejected, pipeline.expired) == (2, 1, 1, 0)
