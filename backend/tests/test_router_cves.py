"""Route-level tests for GET /api/cves and GET /api/cves/{cve_id}."""

from unittest.mock import AsyncMock, patch

import httpx
import pytest


def _make_cve_row(cve_id: str = "CVE-2024-0001", severity: int = 4) -> dict:
    return {
        "cve_id": cve_id,
        "severity": severity,
        "cvss": 9.8,
        "epss_probability": 0.85,
        "impact_score": 8.5,
        "fixable": True,
        "fixed_by": "2.0.0",
        "affected_images": 1,
        "affected_deployments": 2,
        "first_seen": None,
        "published_on": None,
        "operating_system": "rhel:8",
        "component_names": ["openssl"],
    }


def _make_cve_detail_row(cve_id: str = "CVE-2024-0001") -> dict:
    return {
        **_make_cve_row(cve_id),
        "components": [],
        "affected_deployments_list": [],
    }


@pytest.fixture
def patch_cve_filter():
    """Patch fetch_filtered_cves which is the main data source for GET /api/cves."""
    with patch("app.routers.cves.fetch_filtered_cves") as mock_fetch:
        yield mock_fetch


@pytest.fixture
def patch_sx():
    """Patch stackrox queries used by CVE detail endpoint."""
    with patch("app.routers.cves.sx") as mock_sx:
        mock_sx.list_namespaces = AsyncMock(return_value=[])
        mock_sx.get_all_cves = AsyncMock(return_value=[])
        mock_sx.get_cve_detail = AsyncMock(return_value=None)
        mock_sx.get_affected_deployments = AsyncMock(return_value=[])
        mock_sx.get_affected_components = AsyncMock(return_value=[])
        mock_sx.get_affected_components_with_origin = AsyncMock(return_value=[])
        mock_sx.get_cve_origin_ratings = AsyncMock(return_value=[])
        mock_sx.get_cves_grouped_by_image = AsyncMock(return_value=[])
        mock_sx.get_cves_for_image = AsyncMock(return_value=[])
        mock_sx.get_cve_protobuf_data = AsyncMock(return_value=None)
        mock_sx.get_cve_protobuf_data_all = AsyncMock(return_value=None)
        mock_sx.get_first_system_occurrence = AsyncMock(return_value=None)
        yield mock_sx


# -- GET /api/cves --


async def test_list_cves_returns_200(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    from app.schemas.cve import CveListItem, SeverityLevel

    patch_cve_filter.return_value = [
        CveListItem(
            cve_id="CVE-2024-0001",
            severity=SeverityLevel.CRITICAL,
            cvss=9.8,
            epss_probability=0.85,
            impact_score=8.5,
            fixable=True,
            fixed_by="2.0.0",
            affected_images=1,
            affected_deployments=2,
            first_seen=None,
        ),
    ]
    resp = await sec_team_client.get("/api/cves")
    assert resp.status_code == 200


async def test_list_cves_response_shape(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    from app.schemas.cve import CveListItem, SeverityLevel

    patch_cve_filter.return_value = [
        CveListItem(
            cve_id="CVE-2024-0001",
            severity=SeverityLevel.CRITICAL,
            cvss=9.8,
            epss_probability=0.85,
            impact_score=8.5,
            fixable=True,
            fixed_by="2.0.0",
            affected_images=1,
            affected_deployments=2,
            first_seen=None,
        ),
    ]
    resp = await sec_team_client.get("/api/cves")
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["total"] == 1
    item = data["items"][0]
    assert item["cve_id"] == "CVE-2024-0001"
    assert item["severity"] == 4


async def test_list_cves_empty(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    patch_cve_filter.return_value = []
    resp = await sec_team_client.get("/api/cves")
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


async def test_list_cves_forwards_ignore_thresholds(team_member_client: httpx.AsyncClient, patch_cve_filter):
    patch_cve_filter.return_value = []

    resp = await team_member_client.get("/api/cves?ignore_thresholds=true")

    assert resp.status_code == 200
    assert patch_cve_filter.call_args.kwargs["ignore_thresholds"] is True


async def test_list_cves_ignore_thresholds_defaults_false(team_member_client: httpx.AsyncClient, patch_cve_filter):
    patch_cve_filter.return_value = []

    await team_member_client.get("/api/cves")

    assert patch_cve_filter.call_args.kwargs["ignore_thresholds"] is False


async def test_list_cves_pagination(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    from app.schemas.cve import CveListItem, SeverityLevel

    items = [
        CveListItem(
            cve_id=f"CVE-2024-{i:04d}",
            severity=SeverityLevel.MODERATE,
            cvss=5.0,
            epss_probability=0.1,
            impact_score=4.0,
            fixable=False,
            fixed_by=None,
            affected_images=1,
            affected_deployments=1,
            first_seen=None,
        )
        for i in range(5)
    ]
    patch_cve_filter.return_value = items
    resp = await sec_team_client.get("/api/cves?page=1&page_size=2")
    data = resp.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2


# -- GET /api/cves/{cve_id} --


async def test_get_cve_detail_404(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    """Non-existent CVE should return 404."""
    patch_sx.get_cve_detail.return_value = None
    patch_sx.list_namespaces.return_value = []
    resp = await sec_team_client.get("/api/cves/CVE-9999-0001")
    assert resp.status_code == 404


async def test_get_cve_detail_returns_data(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    """Existing CVE should return 200 with detail fields."""
    cve_row = _make_cve_detail_row("CVE-2024-0001")
    patch_sx.get_cve_detail.return_value = cve_row
    patch_sx.list_namespaces.return_value = [{"namespace": "default", "cluster_name": "cluster-a"}]
    patch_sx.get_affected_deployments.return_value = []
    patch_sx.get_affected_components_with_origin.return_value = []

    resp = await sec_team_client.get("/api/cves/CVE-2024-0001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cve_id"] == "CVE-2024-0001"
    assert "affected_deployments_list" in data
    assert "components" in data


async def test_get_cve_detail_team_member_no_namespaces(app, patch_sx, mock_app_db):
    """Team member with no namespaces should get 404."""
    from app.deps import get_current_user
    from tests.conftest import make_current_user

    empty_user = make_current_user(namespaces=[], has_all_namespaces=False)
    app.dependency_overrides[get_current_user] = lambda: empty_user
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    resp = await client.get("/api/cves/CVE-2024-0001")
    assert resp.status_code == 404


# -- origin (vulnerability feed, ACS 4.11.6+) --


async def test_list_cves_forwards_origin(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    from app.schemas.cve import VulnOrigin

    patch_cve_filter.return_value = []

    resp = await sec_team_client.get("/api/cves?origin=debian")

    assert resp.status_code == 200
    assert patch_cve_filter.call_args.kwargs["origin"] is VulnOrigin.DEBIAN


async def test_list_cves_rejects_unknown_origin(sec_team_client: httpx.AsyncClient, patch_cve_filter):
    patch_cve_filter.return_value = []

    resp = await sec_team_client.get("/api/cves?origin=bogus")

    assert resp.status_code == 422
    patch_cve_filter.assert_not_called()


async def test_get_cve_detail_includes_origins(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    patch_sx.get_cve_detail.return_value = {**_make_cve_detail_row("CVE-2024-0001"), "origin_codes": [7, 4]}
    patch_sx.list_namespaces.return_value = [{"namespace": "default", "cluster_name": "cluster-a"}]
    patch_sx.get_affected_components_with_origin.return_value = [
        {
            "component_name": "openssl",
            "component_version": "3.0.1",
            "fixable": True,
            "fixed_by": "3.0.2",
            "origin_code": 4,
        },
        {
            "component_name": "openssl",
            "component_version": "3.0.1",
            "fixable": True,
            "fixed_by": "3.0.2",
            "origin_code": None,
        },
    ]
    patch_sx.get_cve_origin_ratings.return_value = [
        {"origin_code": 4, "severity": 4, "cvss": 9.8, "components": 1},
        {"origin_code": 7, "severity": 2, "cvss": 5.5, "components": 1},
        {"origin_code": None, "severity": 3, "cvss": 7.0, "components": 2},
    ]

    resp = await sec_team_client.get("/api/cves/CVE-2024-0001")

    assert resp.status_code == 200
    data = resp.json()
    assert data["origins"] == ["debian", "red_hat"]
    assert [c["origin"] for c in data["components"]] == ["debian", None]
    assert data["origin_ratings"] == [
        {"origin": "debian", "severity": 4, "cvss": 9.8, "components": 1},
        {"origin": "red_hat", "severity": 2, "cvss": 5.5, "components": 1},
        {"origin": None, "severity": 3, "cvss": 7.0, "components": 2},
    ]
    # Detail uses the origin-aware component query; exports keep the deduplicated one.
    patch_sx.get_affected_components.assert_not_called()


async def test_list_cves_by_image_forwards_origin(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    resp = await sec_team_client.get("/api/cves/by-image?origin=ubuntu")

    assert resp.status_code == 200
    assert patch_sx.get_cves_grouped_by_image.call_args.kwargs["origin"] == "ubuntu"


async def test_list_cves_for_image_forwards_origin(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    resp = await sec_team_client.get("/api/cves/by-image/sha256:abc/cves?origin=osv")

    assert resp.status_code == 200
    assert patch_sx.get_cves_for_image.call_args.kwargs["origin"] == "osv"


async def test_list_cves_by_image_without_origin_passes_none(sec_team_client: httpx.AsyncClient, patch_sx, mock_app_db):
    resp = await sec_team_client.get("/api/cves/by-image")

    assert resp.status_code == 200
    assert patch_sx.get_cves_grouped_by_image.call_args.kwargs["origin"] is None
