"""Tests for the MCP API client."""

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from mcp_server.api_client import RhacsManagerClient


@pytest.fixture
def client():
    return RhacsManagerClient(base_url="http://test-backend:8000")


def _mock_response(data: dict, status_code: int = 200) -> httpx.Response:
    """Build a fake httpx.Response."""
    resp = httpx.Response(
        status_code=status_code,
        json=data,
        request=httpx.Request("GET", "http://test"),
    )
    return resp


class TestHeaders:
    def test_bearer_token_in_headers(self, client):
        headers = client._headers("my-token-123")
        assert headers == {"Authorization": "Bearer my-token-123"}


class TestGetRequests:
    @pytest.mark.parametrize(
        "method,args,expected_path",
        [
            ("get_dashboard", ("tok",), "/api/dashboard"),
            ("get_cve", ("tok", "CVE-2024-1234"), "/api/cves/CVE-2024-1234"),
            ("get_cve_deployments", ("tok", "CVE-2024-1234"), "/api/cves/CVE-2024-1234/deployments"),
            ("get_me", ("tok",), "/api/auth/me"),
        ],
    )
    async def test_simple_get_endpoints(self, client, method, args, expected_path):
        mock_resp = _mock_response({"result": "ok"})
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            result = await getattr(client, method)(*args)

            assert json.loads(result) == {"result": "ok"}
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            assert call_args[0][0] == expected_path
            assert call_args[1]["headers"] == {"Authorization": "Bearer tok"}

    async def test_search_cves_builds_params(self, client):
        mock_resp = _mock_response({"items": [], "total": 0})
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            await client.search_cves(
                "tok",
                search="openssl",
                severity="critical",
                fixable=True,
                namespace="payments",
                page=2,
                page_size=10,
            )

            call_params = mock_get.call_args[1]["params"]
            assert call_params["search"] == "openssl"
            assert call_params["severity"] == "critical"
            assert call_params["fixable"] is True
            assert call_params["namespace"] == "payments"
            assert call_params["page"] == 2
            assert call_params["page_size"] == 10

    async def test_search_cves_omits_none_params(self, client):
        mock_resp = _mock_response({"items": [], "total": 0})
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            await client.search_cves("tok")

            call_params = mock_get.call_args[1]["params"]
            assert "search" not in call_params
            assert "severity" not in call_params
            assert "fixable" not in call_params
            assert call_params["page"] == 1
            assert call_params["page_size"] == 20

    async def test_list_risk_acceptances_params(self, client):
        mock_resp = _mock_response({"items": []})
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            await client.list_risk_acceptances("tok", status="pending", cve_id="CVE-2024-5678")

            call_params = mock_get.call_args[1]["params"]
            assert call_params["status"] == "pending"
            assert call_params["cve_id"] == "CVE-2024-5678"

    async def test_list_remediations_params(self, client):
        mock_resp = _mock_response({"items": []})
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            await client.list_remediations("tok", status="open", namespace="frontend")

            call_params = mock_get.call_args[1]["params"]
            assert call_params["status"] == "open"
            assert call_params["namespace"] == "frontend"


class TestPostRequests:
    async def test_create_risk_acceptance(self, client):
        mock_resp = _mock_response({"id": "ra-1"}, status_code=201)
        mock_post = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post = mock_post
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            data = {"cve_id": "CVE-2024-1234", "justification": "test"}
            result = await client.create_risk_acceptance("tok", data)

            assert json.loads(result) == {"id": "ra-1"}
            mock_post.assert_called_once_with(
                "/api/risk-acceptances",
                headers={"Authorization": "Bearer tok"},
                json=data,
            )

    async def test_create_remediation(self, client):
        mock_resp = _mock_response({"id": "rem-1"}, status_code=201)
        mock_post = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post = mock_post
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            data = {"cve_id": "CVE-2024-1234", "namespace": "payments", "cluster_name": "cluster-a"}
            result = await client.create_remediation("tok", data)

            assert json.loads(result) == {"id": "rem-1"}
            mock_post.assert_called_once_with(
                "/api/remediations",
                headers={"Authorization": "Bearer tok"},
                json=data,
            )


class TestPatchRequests:
    async def test_update_remediation(self, client):
        mock_resp = _mock_response({"id": "rem-1", "status": "in_progress"})
        mock_patch = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.patch = mock_patch
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            result = await client.update_remediation("tok", "rem-1", {"status": "in_progress"})

            assert json.loads(result)["status"] == "in_progress"
            mock_patch.assert_called_once_with(
                "/api/remediations/rem-1",
                headers={"Authorization": "Bearer tok"},
                json={"status": "in_progress"},
            )


class TestErrorHandling:
    async def test_http_error_raised(self, client):
        mock_resp = _mock_response({"detail": "Not found"}, status_code=404)
        mock_get = AsyncMock(return_value=mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get = mock_get
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            MockClient.return_value = instance

            with pytest.raises(httpx.HTTPStatusError):
                await client.get_me("tok")


class TestBaseUrlHandling:
    def test_trailing_slash_stripped(self):
        c = RhacsManagerClient(base_url="http://backend:8000/")
        assert c.base_url == "http://backend:8000"

    def test_no_trailing_slash(self):
        c = RhacsManagerClient(base_url="http://backend:8000")
        assert c.base_url == "http://backend:8000"
