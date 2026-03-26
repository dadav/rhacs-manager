"""Tests for the MCP API client."""

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from mcp_server.api_client import AuthContext, RhacsManagerClient


@pytest.fixture
def client():
    return RhacsManagerClient(base_url="http://test-backend:8000")


@pytest.fixture
def auth():
    return AuthContext(
        forwarded_user="testuser",
        forwarded_groups="group-a,group-b",
        forwarded_namespaces="payments:cluster-a,frontend:cluster-a",
        forwarded_namespace_emails="payments:cluster-a=team@example.com",
    )


def _mock_response(data: dict, status_code: int = 200) -> httpx.Response:
    """Build a fake httpx.Response."""
    return httpx.Response(
        status_code=status_code,
        json=data,
        request=httpx.Request("GET", "http://test"),
    )


def _mock_client(mock_response: httpx.Response) -> AsyncMock:
    """Build a mock httpx.AsyncClient with request method returning the given response."""
    instance = AsyncMock()
    instance.request = AsyncMock(return_value=mock_response)
    instance.__aenter__ = AsyncMock(return_value=instance)
    instance.__aexit__ = AsyncMock(return_value=None)
    return instance


class TestAuthContext:
    def test_to_headers_includes_forwarded_headers(self, auth):
        headers = auth.to_headers()
        assert headers["X-Forwarded-User"] == "testuser"
        assert headers["X-Forwarded-Groups"] == "group-a,group-b"
        assert headers["X-Forwarded-Namespaces"] == "payments:cluster-a,frontend:cluster-a"
        assert headers["X-Forwarded-Namespace-Emails"] == "payments:cluster-a=team@example.com"

    def test_to_headers_includes_api_key_when_set(self, auth):
        with patch("mcp_server.api_client.settings") as mock_settings:
            mock_settings.api_key = "secret-key"
            headers = auth.to_headers()
            assert headers["X-Api-Key"] == "secret-key"

    def test_to_headers_omits_api_key_when_empty(self, auth):
        with patch("mcp_server.api_client.settings") as mock_settings:
            mock_settings.api_key = ""
            headers = auth.to_headers()
            assert "X-Api-Key" not in headers


class TestGetRequests:
    @pytest.mark.parametrize(
        "method,args,expected_path",
        [
            ("get_dashboard", (), "/api/dashboard"),
            ("get_cve", ("CVE-2024-1234",), "/api/cves/CVE-2024-1234"),
            ("get_cve_deployments", ("CVE-2024-1234",), "/api/cves/CVE-2024-1234/deployments"),
            ("get_me", (), "/api/auth/me"),
        ],
    )
    async def test_simple_get_endpoints(self, client, auth, method, args, expected_path):
        mock_resp = _mock_response({"result": "ok"})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            result = await getattr(client, method)(auth, *args)

            assert json.loads(result) == {"result": "ok"}
            instance.request.assert_called_once()
            call_args = instance.request.call_args
            assert call_args[0][0] == "GET"
            assert call_args[0][1] == expected_path
            assert call_args[1]["headers"]["X-Forwarded-User"] == "testuser"

    async def test_search_cves_builds_params(self, client, auth):
        mock_resp = _mock_response({"items": [], "total": 0})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.search_cves(
                auth,
                search="openssl",
                severity="critical",
                fixable=True,
                namespace="payments",
                page=2,
                page_size=10,
            )

            call_params = instance.request.call_args[1]["params"]
            assert call_params["search"] == "openssl"
            assert call_params["severity"] == "critical"
            assert call_params["fixable"] is True
            assert call_params["namespace"] == "payments"
            assert call_params["page"] == 2
            assert call_params["page_size"] == 10

    async def test_search_cves_omits_none_params(self, client, auth):
        mock_resp = _mock_response({"items": [], "total": 0})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.search_cves(auth)

            call_params = instance.request.call_args[1]["params"]
            assert "search" not in call_params
            assert "severity" not in call_params
            assert "fixable" not in call_params
            assert call_params["page"] == 1
            assert call_params["page_size"] == 20

    async def test_list_risk_acceptances_params(self, client, auth):
        mock_resp = _mock_response({"items": []})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_risk_acceptances(auth, status="pending", cve_id="CVE-2024-5678")

            call_params = instance.request.call_args[1]["params"]
            assert call_params["status"] == "pending"
            assert call_params["cve_id"] == "CVE-2024-5678"

    async def test_list_remediations_params(self, client, auth):
        mock_resp = _mock_response({"items": []})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_remediations(auth, status="open", namespace="frontend")

            call_params = instance.request.call_args[1]["params"]
            assert call_params["status"] == "open"
            assert call_params["namespace"] == "frontend"


class TestPostRequests:
    async def test_create_risk_acceptance(self, client, auth):
        mock_resp = _mock_response({"id": "ra-1"}, status_code=201)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            data = {"cve_id": "CVE-2024-1234", "justification": "test"}
            result = await client.create_risk_acceptance(auth, data)

            assert json.loads(result) == {"id": "ra-1"}
            instance.request.assert_called_once()
            call_args = instance.request.call_args
            assert call_args[0][0] == "POST"
            assert call_args[0][1] == "/api/risk-acceptances"
            assert call_args[1]["headers"]["X-Forwarded-User"] == "testuser"
            assert call_args[1]["json"] == data

    async def test_create_remediation(self, client, auth):
        mock_resp = _mock_response({"id": "rem-1"}, status_code=201)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            data = {"cve_id": "CVE-2024-1234", "namespace": "payments", "cluster_name": "cluster-a"}
            result = await client.create_remediation(auth, data)

            assert json.loads(result) == {"id": "rem-1"}
            instance.request.assert_called_once()
            assert instance.request.call_args[1]["headers"]["X-Forwarded-User"] == "testuser"


class TestPatchRequests:
    async def test_update_remediation(self, client, auth):
        mock_resp = _mock_response({"id": "rem-1", "status": "in_progress"})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            result = await client.update_remediation(auth, "rem-1", {"status": "in_progress"})

            assert json.loads(result)["status"] == "in_progress"
            instance.request.assert_called_once()
            call_args = instance.request.call_args
            assert call_args[0][0] == "PATCH"
            assert call_args[0][1] == "/api/remediations/rem-1"
            assert call_args[1]["headers"]["X-Forwarded-User"] == "testuser"


class TestErrorHandling:
    async def test_http_error_raised(self, client, auth):
        mock_resp = _mock_response({"detail": "Not found"}, status_code=404)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(httpx.HTTPStatusError):
                await client.get_me(auth)


class TestBaseUrlHandling:
    def test_trailing_slash_stripped(self):
        c = RhacsManagerClient(base_url="http://backend:8000/")
        assert c.base_url == "http://backend:8000"

    def test_no_trailing_slash(self):
        c = RhacsManagerClient(base_url="http://backend:8000")
        assert c.base_url == "http://backend:8000"
