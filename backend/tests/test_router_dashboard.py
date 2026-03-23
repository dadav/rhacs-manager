"""Route-level tests for GET /api/dashboard."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

DASHBOARD_EXPECTED_KEYS = {
    "stat_total_cves",
    "stat_escalations",
    "stat_upcoming_escalations",
    "stat_fixable_critical_cves",
    "stat_open_risk_acceptances",
    "severity_distribution",
    "cves_per_namespace",
    "priority_cves",
    "high_epss_cves",
    "cve_trend",
    "epss_matrix",
    "cluster_heatmap",
    "aging_distribution",
    "top_vulnerable_components",
    "risk_acceptance_pipeline",
    "fixability_breakdown",
    "fixable_trend",
    "mttr_by_severity",
}


def _patch_sx_queries():
    """Return a patch context that mocks all StackRox query functions used by the dashboard."""
    mock_sx = AsyncMock()
    mock_sx.get_all_cves.return_value = [
        {
            "cve_id": "CVE-2024-0001",
            "severity": 4,
            "cvss": 9.8,
            "epss_probability": 0.95,
            "impact_score": 9.0,
            "fixable": True,
            "fixed_by": "1.2.3",
            "affected_images": 2,
            "affected_deployments": 3,
            "first_seen": None,
            "published_on": None,
        },
    ]
    mock_sx.get_cves_for_namespaces.return_value = mock_sx.get_all_cves.return_value
    mock_sx.get_severity_distribution.return_value = [{"severity": 4, "count": 1}]
    mock_sx.get_cves_per_namespace.return_value = []
    mock_sx.get_cve_trend.return_value = []
    mock_sx.get_epss_risk_matrix.return_value = []
    mock_sx.get_cluster_heatmap.return_value = []
    mock_sx.get_cve_aging.return_value = []
    mock_sx.get_top_vulnerable_components.return_value = []
    mock_sx.get_fixability_breakdown.return_value = {"fixable": 1, "unfixable": 0}
    mock_sx.get_fixable_trend.return_value = []
    mock_sx.list_namespaces.return_value = []
    return mock_sx


@pytest.fixture
def sx_mock():
    mock_sx = _patch_sx_queries()
    with (
        patch("app.routers.dashboard.sx", mock_sx),
        patch("app.routers.dashboard.StackRoxSessionLocal") as mock_session_local,
        patch("app.routers.dashboard.AppSessionLocal") as mock_app_session_local,
    ):
        # Make StackRoxSessionLocal() context manager return a mock session that proxies to sx_mock
        sx_session = AsyncMock()
        mock_session_local.return_value.__aenter__ = AsyncMock(return_value=sx_session)
        mock_session_local.return_value.__aexit__ = AsyncMock(return_value=False)

        # Make AppSessionLocal() context manager return a mock session
        app_session = AsyncMock()
        app_result = AsyncMock()
        app_result.scalar.return_value = 0
        app_result.scalars.return_value.all.return_value = []
        app_session.execute.return_value = app_result
        mock_app_session_local.return_value.__aenter__ = AsyncMock(return_value=app_session)
        mock_app_session_local.return_value.__aexit__ = AsyncMock(return_value=False)

        # Patch the helper functions that open their own sessions
        with (
            patch("app.routers.dashboard._sx_severity_distribution", return_value=[{"severity": 4, "count": 1}]),
            patch("app.routers.dashboard._sx_cves_per_namespace", return_value=[]),
            patch("app.routers.dashboard._sx_cve_trend", return_value=[]),
            patch("app.routers.dashboard._sx_epss_risk_matrix", return_value=[]),
            patch("app.routers.dashboard._sx_cluster_heatmap", return_value=[]),
            patch("app.routers.dashboard._sx_cve_aging", return_value=[]),
            patch("app.routers.dashboard._sx_top_vulnerable_components", return_value=[]),
            patch("app.routers.dashboard._sx_fixability_breakdown", return_value={"fixable": 1, "unfixable": 0}),
            patch("app.routers.dashboard._sx_fixable_trend", return_value=[]),
            patch("app.routers.dashboard._upcoming_escalations", return_value=[]),
            patch("app.routers.dashboard._ra_pipeline") as mock_ra_pipeline,
            patch("app.routers.dashboard._mttr_by_severity", return_value=[]),
        ):
            from app.schemas.dashboard import RiskAcceptancePipeline

            mock_ra_pipeline.return_value = RiskAcceptancePipeline(requested=0, approved=0, rejected=0, expired=0)
            yield mock_sx


async def test_dashboard_returns_200_sec_team(sec_team_client: httpx.AsyncClient, sx_mock):
    resp = await sec_team_client.get("/api/dashboard")
    assert resp.status_code == 200


async def test_dashboard_response_has_all_keys(sec_team_client: httpx.AsyncClient, sx_mock):
    resp = await sec_team_client.get("/api/dashboard")
    data = resp.json()
    assert DASHBOARD_EXPECTED_KEYS.issubset(data.keys()), f"Missing keys: {DASHBOARD_EXPECTED_KEYS - data.keys()}"


async def test_dashboard_stat_total_cves(sec_team_client: httpx.AsyncClient, sx_mock):
    resp = await sec_team_client.get("/api/dashboard")
    data = resp.json()
    # sx mock returns 1 CVE
    assert data["stat_total_cves"] == 1


async def test_dashboard_severity_distribution_shape(sec_team_client: httpx.AsyncClient, sx_mock):
    resp = await sec_team_client.get("/api/dashboard")
    data = resp.json()
    assert isinstance(data["severity_distribution"], list)
    if data["severity_distribution"]:
        entry = data["severity_distribution"][0]
        assert "severity" in entry
        assert "count" in entry


async def test_dashboard_team_member_no_namespaces_returns_zeros(app, sx_mock):
    """A team member with no namespaces should get an empty dashboard, not a 403."""
    from app.deps import get_current_user
    from tests.conftest import make_current_user

    empty_user = make_current_user(namespaces=[], has_all_namespaces=False)
    app.dependency_overrides[get_current_user] = lambda: empty_user
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    resp = await client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["stat_total_cves"] == 0


async def test_dashboard_fixability_breakdown(sec_team_client: httpx.AsyncClient, sx_mock):
    resp = await sec_team_client.get("/api/dashboard")
    data = resp.json()
    fb = data["fixability_breakdown"]
    assert "fixable" in fb
    assert "unfixable" in fb
