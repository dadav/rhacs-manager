"""Tests for the MCP API client."""

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from mcp_server.api_client import AuthContext, BackendError, RhacsManagerClient


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
            # Severity is translated from name to backend int (CRITICAL = 4).
            assert call_params["severity"] == 4
            assert call_params["fixable"] is True
            assert call_params["namespace"] == "payments"
            assert call_params["page"] == 2
            assert call_params["page_size"] == 10

    async def test_search_cves_severity_int_passthrough(self, client, auth):
        mock_resp = _mock_response({"items": [], "total": 0})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.search_cves(auth, severity=3)

            assert instance.request.call_args[1]["params"]["severity"] == 3

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
            assert "fix_overdue" not in call_params
            assert "prioritized_only" not in call_params
            assert call_params["page"] == 1
            assert call_params["page_size"] == 20

    async def test_search_cves_4_10_filters(self, client, auth):
        mock_resp = _mock_response({"items": [], "total": 0})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.search_cves(
                auth,
                fix_overdue=True,
                prioritized_only=True,
                cvss_min=7.0,
                epss_min=0.5,
                age_min=10,
                age_max=365,
                deployment="api",
                risk_status="approved",
                remediation_status="open",
            )

            p = instance.request.call_args[1]["params"]
            assert p["fix_overdue"] is True
            assert p["prioritized_only"] is True
            assert p["cvss_min"] == 7.0
            assert p["epss_min"] == 0.5
            assert p["age_min"] == 10
            assert p["age_max"] == 365
            assert p["deployment"] == "api"
            assert p["risk_status"] == "approved"
            assert p["remediation_status"] == "open"

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

    async def test_create_suppression_rule(self, client, auth):
        mock_resp = _mock_response({"id": "sup-1"}, status_code=201)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            data = {"type": "cve", "cve_id": "CVE-2024-1234", "reason": "not applicable here"}
            result = await client.create_suppression_rule(auth, data)

            assert json.loads(result) == {"id": "sup-1"}
            instance.request.assert_called_once()
            call_args = instance.request.call_args
            assert call_args[0][0] == "POST"
            assert call_args[0][1] == "/api/suppression-rules"
            assert call_args[1]["json"] == data


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
    async def test_http_error_raises_backend_error(self, client, auth):
        mock_resp = _mock_response({"detail": "Not found"}, status_code=404)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(BackendError) as exc_info:
                await client.get_me(auth)

            assert exc_info.value.status == 404
            assert exc_info.value.detail == "Not found"
            assert "GET /api/auth/me" in str(exc_info.value)

    async def test_validation_error_detail_is_serialized(self, client, auth):
        # FastAPI 422 returns detail as a list of dicts; we serialize it for the message.
        body = {"detail": [{"loc": ["query", "page"], "msg": "must be > 0", "type": "value_error"}]}
        mock_resp = _mock_response(body, status_code=422)
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(BackendError) as exc_info:
                await client.get_me(auth)

            assert exc_info.value.status == 422
            assert "must be > 0" in exc_info.value.detail

    async def test_non_json_error_falls_back_to_text(self, client, auth):
        mock_resp = httpx.Response(status_code=502, text="bad gateway", request=httpx.Request("GET", "http://test"))
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(BackendError) as exc_info:
                await client.get_me(auth)

            assert exc_info.value.status == 502
            assert "bad gateway" in exc_info.value.detail


class TestDashboardTrim:
    async def test_chart_only_fields_dropped(self, client, auth):
        full_payload = {
            "stat_total_cves": 42,
            "stat_fix_overdue_cves": 3,
            "fix_overdue_threshold_days": 30,
            "severity_distribution": [{"severity": 4, "count": 5}],
            "priority_cves": [],
            "cve_trend": [{"date": "2026-05-01", "count": 1}],
            "epss_matrix": [[0.5, 7.0]],
            "cluster_heatmap": [{"cluster": "cluster-a"}],
            "fixable_trend": [{"date": "2026-05-01", "fixable": 10}],
            "mttr_by_severity": [{"severity": 4, "mttr_days": 7}],
        }
        instance = _mock_client(_mock_response(full_payload))

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance
            result = await client.get_dashboard(auth)

        trimmed = json.loads(result)
        assert "cve_trend" not in trimmed
        assert "epss_matrix" not in trimmed
        assert "cluster_heatmap" not in trimmed
        assert "fixable_trend" not in trimmed
        assert "mttr_by_severity" not in trimmed
        # Headline stats and ranked lists survive.
        assert trimmed["stat_total_cves"] == 42
        assert trimmed["stat_fix_overdue_cves"] == 3
        assert trimmed["fix_overdue_threshold_days"] == 30
        assert trimmed["severity_distribution"] == [{"severity": 4, "count": 5}]


class TestCvesByImage:
    async def test_by_image_path_and_params(self, client, auth):
        instance = _mock_client(_mock_response([]))

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance
            await client.get_cves_by_image(
                auth,
                cluster="cluster-a",
                namespace="payments",
                severity="critical",
                fixable=True,
                cvss_min=7.0,
                image_name="quay.io/app",
            )

        call_args = instance.request.call_args
        assert call_args[0] == ("GET", "/api/cves/by-image")
        params = call_args[1]["params"]
        assert params["cluster"] == "cluster-a"
        assert params["namespace"] == "payments"
        assert params["severity"] == 4  # critical -> int
        assert params["fixable"] is True
        assert params["cvss_min"] == 7.0
        assert params["image_name"] == "quay.io/app"

    async def test_by_image_no_filters(self, client, auth):
        instance = _mock_client(_mock_response([]))

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance
            await client.get_cves_by_image(auth)

        assert instance.request.call_args[1]["params"] is None


class TestEscalationsAndSettings:
    async def test_list_escalations_path_and_params(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_escalations(auth, cluster="cluster-a", namespace="payments")

            call_args = instance.request.call_args
            assert call_args[0] == ("GET", "/api/escalations")
            assert call_args[1]["params"] == {"cluster": "cluster-a", "namespace": "payments"}

    async def test_list_escalations_no_filters(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_escalations(auth)

            assert instance.request.call_args[1]["params"] is None

    async def test_get_upcoming_escalations(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.get_upcoming_escalations(auth, namespace="payments")

            call_args = instance.request.call_args
            assert call_args[0] == ("GET", "/api/escalations/upcoming")
            assert call_args[1]["params"] == {"namespace": "payments"}

    async def test_get_settings_sec_team_path(self, client, auth):
        mock_resp = _mock_response({"min_cvss_score": 0.0, "escalation_rules": []})
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            result = await client.get_settings(auth)

            assert instance.request.call_args[0][1] == "/api/settings"
            assert "escalation_rules" in result

    async def test_get_settings_falls_back_on_403(self, client, auth):
        # First call returns 403, second returns thresholds.
        forbidden = _mock_response({"detail": "Sec team only"}, status_code=403)
        thresholds = _mock_response({"min_cvss_score": 5.0, "min_epss_score": 0.1})

        instance = AsyncMock()
        instance.request = AsyncMock(side_effect=[forbidden, thresholds])
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=None)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            result = await client.get_settings(auth)

            assert instance.request.call_count == 2
            assert instance.request.call_args_list[0][0][1] == "/api/settings"
            assert instance.request.call_args_list[1][0][1] == "/api/settings/thresholds"
            assert json.loads(result) == {"min_cvss_score": 5.0, "min_epss_score": 0.1}

    async def test_get_settings_other_errors_propagate(self, client, auth):
        not_found = _mock_response({"detail": "boom"}, status_code=500)
        instance = _mock_client(not_found)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(BackendError) as exc_info:
                await client.get_settings(auth)

            assert exc_info.value.status == 500


class TestBaseUrlHandling:
    def test_trailing_slash_stripped(self):
        c = RhacsManagerClient(base_url="http://backend:8000/")
        assert c.base_url == "http://backend:8000"

    def test_no_trailing_slash(self):
        c = RhacsManagerClient(base_url="http://backend:8000")
        assert c.base_url == "http://backend:8000"
