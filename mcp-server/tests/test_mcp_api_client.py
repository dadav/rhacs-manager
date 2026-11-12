"""Tests for the MCP API client."""

import json
import logging
from dataclasses import replace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from mcp.server.mcpserver.exceptions import ToolError

from mcp_server.api_client import AuthContext, BackendError, RhacsManagerClient, _paginate_list


@pytest.fixture
def client():
    return RhacsManagerClient(base_url="http://test-backend:8000")


@pytest.fixture
def auth():
    return AuthContext(
        forwarded_user="testuser",
        forwarded_full_name="Test User",
        forwarded_groups="group-a,group-b",
        forwarded_namespaces="payments:cluster-a,frontend:cluster-a",
        forwarded_namespace_emails="payments:cluster-a=team@example.com",
        forwarded_cluster="cluster-a",
    )


def _mock_response(data: dict | list, status_code: int = 200) -> httpx.Response:
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
        assert headers["X-Forwarded-Full-Name"] == "Test User"
        assert headers["X-Forwarded-Groups"] == "group-a,group-b"
        assert headers["X-Forwarded-Namespaces"] == "payments:cluster-a,frontend:cluster-a"
        assert headers["X-Forwarded-Namespace-Emails"] == "payments:cluster-a=team@example.com"
        assert headers["X-Forwarded-Cluster"] == "cluster-a"

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
            assert call_params["fix_overdue"] is False
            assert call_params["prioritized_only"] is False
            assert call_params["page"] == 1
            assert call_params["page_size"] == 20

    async def test_search_cves_workflow_filters(self, client, auth):
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
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_risk_acceptances(auth, status="requested", cve_id="CVE-2024-5678")

            call_params = instance.request.call_args[1]["params"]
            assert call_params["status"] == "requested"
            assert call_params["cve_id"] == "CVE-2024-5678"

    async def test_list_remediations_params(self, client, auth):
        mock_resp = _mock_response([])
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
        instance = _mock_client(_mock_response([{"id": "rem-1"}], status_code=201))
        with patch("mcp_server.api_client.httpx.AsyncClient", return_value=instance):
            data = {"cve_id": "CVE-2024-1234", "targets": [{"namespace": "payments", "cluster_name": "cluster-a"}]}
            result = await client.create_remediation(auth, data)
        assert json.loads(result) == [{"id": "rem-1"}]
        assert instance.request.call_args.args == ("POST", "/api/remediations/batch")
        assert instance.request.call_args.kwargs["json"] == data

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

    def test_backend_error_is_tool_error(self):
        # mcp v2 masks the text of non-ToolError exceptions; BackendError must stay visible.
        assert issubclass(BackendError, ToolError)

    async def test_transport_error_wrapped_and_logged_at_warning(self, client, auth, caplog):
        caplog.set_level(logging.INFO)
        instance = _mock_client(_mock_response({}))
        instance.request = AsyncMock(
            side_effect=httpx.ConnectError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")
        )

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(ToolError) as exc_info:
                await client.get_me(auth)

        assert not isinstance(exc_info.value, BackendError)
        assert "backend request failed (ConnectError)" in str(exc_info.value)
        assert isinstance(exc_info.value.__cause__, httpx.ConnectError)

        warnings = [r for r in caplog.records if r.levelno == logging.WARNING and r.name == "mcp_server.api_client"]
        assert len(warnings) == 1
        message = warnings[0].getMessage()
        assert "http://test-backend:8000/api/auth/me" in message
        assert "CERTIFICATE_VERIFY_FAILED" in message

    async def test_timeout_is_wrapped(self, client, auth):
        instance = _mock_client(_mock_response({}))
        instance.request = AsyncMock(side_effect=httpx.ReadTimeout("read timed out"))

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            with pytest.raises(ToolError, match=r"backend request failed \(ReadTimeout\)"):
                await client.get_me(auth)


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
            "cve_history": [{"date": "2026-05-01", "total": 10}],
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
        assert "cve_history" not in trimmed
        assert "fixable_trend" not in client._DASHBOARD_CHART_FIELDS
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

        assert instance.request.call_args[1]["params"] == {"ignore_thresholds": False}


class TestEscalationsAndSettings:
    async def test_list_escalations_path_and_params(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_escalations(auth, cluster="cluster-a", namespace="payments")

            call_args = instance.request.call_args
            assert call_args[0] == ("GET", "/api/escalations/active/search")
            assert call_args[1]["params"] == {
                "cluster": "cluster-a",
                "namespace": "payments",
                "page": 1,
                "page_size": 20,
            }

    async def test_list_escalations_no_filters(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.list_escalations(auth)

            assert instance.request.call_args[1]["params"] == {"page": 1, "page_size": 20}

    async def test_get_upcoming_escalations(self, client, auth):
        mock_resp = _mock_response([])
        instance = _mock_client(mock_resp)

        with patch("mcp_server.api_client.httpx.AsyncClient") as MockClient:
            MockClient.return_value = instance

            await client.get_upcoming_escalations(auth, namespace="payments")

            call_args = instance.request.call_args
            assert call_args[0] == ("GET", "/api/escalations/upcoming/search")
            assert call_args[1]["params"] == {"namespace": "payments", "page": 1, "page_size": 20}

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


@pytest.mark.parametrize("email", ["", "person@example.com"])
@pytest.mark.parametrize("method", ["GET", "POST", "PATCH", "PUT", "DELETE"])
async def test_identity_and_language_headers_on_every_request(client, auth, email, method):
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={})

    client._client = httpx.AsyncClient(base_url=client.base_url, transport=httpx.MockTransport(respond))
    try:
        await client._request(method, "/api/test", replace(auth, forwarded_email=email))
    finally:
        await client.aclose()
    headers = requests[0].headers
    assert headers["accept-language"] == "en"
    assert headers["x-forwarded-user"] == "testuser"
    if email:
        assert headers["x-forwarded-email"] == email
    else:
        assert "x-forwarded-email" not in headers


@pytest.mark.parametrize(
    ("method", "args", "expected_path"),
    [
        ("get_cve", ("../settings",), b"/api/cves/..%2Fsettings"),
        ("get_image_detail", ("quay.io/image@sha256:abc?x#y",), b"/api/images/quay.io%2Fimage%40sha256%3Aabc%3Fx%23y"),
        ("update_remediation", ("../settings", {"notes": "edit"}), b"/api/remediations/..%2Fsettings"),
        ("set_cve_subscription", ("../settings", True), b"/api/cves/..%2Fsettings/subscription"),
        ("set_cve_subscription", ("../settings", False), b"/api/cves/..%2Fsettings/subscription"),
    ],
)
async def test_path_parameters_quoted_on_wire(client, auth, method, args, expected_path):
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={})

    client._client = httpx.AsyncClient(base_url=client.base_url, transport=httpx.MockTransport(respond))
    try:
        await getattr(client, method)(auth, *args)
    finally:
        await client.aclose()
    assert requests[0].url.raw_path.split(b"?")[0] == expected_path


@pytest.mark.parametrize(
    ("items", "page", "size", "expected"),
    [
        ([1, 2, 3, 4, 5], 1, 2, [1, 2]),
        ([1, 2, 3, 4, 5], 2, 2, [3, 4]),
        ([1, 2, 3, 4, 5], 3, 2, [5]),
        ([1, 2, 3, 4, 5], 4, 2, []),
        ([], 1, 20, []),
    ],
)
def test_paginate_list(items, page, size, expected):
    assert json.loads(_paginate_list(json.dumps(items), page, size)) == {
        "items": expected,
        "total": len(items),
        "page": page,
        "page_size": size,
    }


@pytest.mark.parametrize(("page", "size"), [(0, 1), (-1, 1), (1, 0), (1, -1)])
def test_paginate_list_rejects_invalid_pages(page, size):
    with pytest.raises(ToolError, match="at least 1"):
        _paginate_list("[]", page, size)


@pytest.mark.parametrize(
    ("method", "path", "filters"),
    [
        (
            "list_risk_acceptances",
            "/api/risk-acceptances",
            {
                "status": "approved",
                "cve_id": "CVE-2024-1234",
                "cluster": "cluster-a",
                "namespace": "payments",
            },
        ),
        (
            "list_remediations",
            "/api/remediations",
            {
                "status": "open",
                "cve_id": "CVE-2024-1234",
                "cluster": "cluster-a",
                "namespace": "payments",
                "overdue": False,
                "assigned_to": "user-1",
            },
        ),
        (
            "list_suppression_rules",
            "/api/suppression-rules",
            {
                "status": "approved",
                "type": "cve",
                "cve_id": "CVE-2024-1234",
            },
        ),
    ],
)
async def test_plain_list_endpoints_paginate_locally(client, auth, method, path, filters):
    instance = _mock_client(_mock_response([{"id": i} for i in range(5)]))
    with patch("mcp_server.api_client.httpx.AsyncClient", return_value=instance):
        result = await getattr(client, method)(auth, **filters, page=2, page_size=2)
    assert instance.request.call_args.args == ("GET", path)
    assert instance.request.call_args.kwargs["params"] == filters
    assert json.loads(result) == {"items": [{"id": 2}, {"id": 3}], "total": 5, "page": 2, "page_size": 2}


@pytest.mark.parametrize(
    ("method", "args", "params"),
    [
        ("get_dashboard", (), {"cluster": "a", "namespace": "n", "ignore_thresholds": True}),
        (
            "search_cves",
            (),
            {
                "origin": "red_hat",
                "show_remediated": True,
                "show_suppressed": True,
                "subscribed_only": True,
                "ignore_thresholds": True,
                "sort_by": "epss_probability",
                "sort_desc": False,
            },
        ),
        ("get_cves_by_image", (), {"epss_min": 0.0, "origin": "osv", "ignore_thresholds": True}),
        ("get_cve", ("CVE-2024-1234",), {"cluster": "a", "namespace": "n"}),
        ("get_image_detail", ("image-1",), {"cluster": "a", "namespace": "n", "ignore_thresholds": True}),
        (
            "list_escalations",
            (),
            {
                "cluster": "a",
                "namespace": "n",
                "search": "CVE",
                "level": 2,
                "contact_status": "needs_action",
                "page": 3,
                "page_size": 100,
            },
        ),
        (
            "get_upcoming_escalations",
            (),
            {
                "cluster": "a",
                "namespace": "n",
                "search": "CVE",
                "next_level": 3,
                "severity": "critical",
                "days_max": 7,
                "page": 2,
                "page_size": 50,
            },
        ),
        (
            "get_fix_recommendations",
            (),
            {
                "cluster": "a",
                "namespace": "n",
                "component": "openssl",
                "severity": "important",
                "fixable_only": True,
                "prioritized_only": True,
                "image_id": "image-1",
                "ignore_thresholds": True,
                "page": 2,
                "page_size": 10,
            },
        ),
    ],
)
async def test_new_parameters_forwarded(client, auth, method, args, params):
    instance = _mock_client(_mock_response({"items": []}))
    with patch("mcp_server.api_client.httpx.AsyncClient", return_value=instance):
        await getattr(client, method)(auth, *args, **params)
    sent = instance.request.call_args.kwargs["params"]
    expected = dict(params)
    if "severity" in expected:
        expected["severity"] = {"critical": 4, "important": 3}[expected["severity"]]
    assert sent.items() >= expected.items()


@pytest.mark.parametrize("count", [0, 9, 10, 13])
async def test_fix_recommendations_trim_only_details(client, auth, count):
    row = {
        "component_name": "openssl",
        "component_version": "1.0",
        "operating_system": "rhel",
        "target_version": "2.0",
        "fix_versions": ["2.0", "vendor-next"],
        "target_uncertain": True,
        "total_cves": count,
        "fixable_cves": count,
        "prioritized_cves": 1,
        "critical_cves": 2,
        "max_severity": 4,
        "max_cvss": 9.0,
        "max_epss": 0.8,
        "affected_images": count,
        "affected_deployments": 30,
        "namespaces": ["payments"],
        "cves": [{"cve_id": f"CVE-2024-{i}"} for i in range(count)],
        "images": [{"image_id": str(i), "image_name": f"image-{i}"} for i in range(count + 1)],
    }
    payload = {"items": [row], "total": 30, "page": 1, "page_size": 10, "visible_cves": 50, "unmapped_cves": 3}
    instance = _mock_client(_mock_response(payload))
    with patch("mcp_server.api_client.httpx.AsyncClient", return_value=instance):
        result = json.loads(await client.get_fix_recommendations(auth))
    assert instance.request.call_args.args == ("GET", "/api/cves/fixes")
    expected_row = dict(
        row,
        cves=row["cves"][:10],
        images=row["images"][:10],
        cves_truncated=max(0, count - 10),
        images_truncated=max(0, count + 1 - 10),
    )
    assert result == dict(payload, items=[expected_row])


@pytest.mark.parametrize(("subscribed", "method"), [(True, "PUT"), (False, "DELETE")])
async def test_set_subscription(client, auth, subscribed, method):
    payload = {"cve_id": "CVE-2024-1234", "subscribed": subscribed}
    instance = _mock_client(_mock_response(payload))
    with patch("mcp_server.api_client.httpx.AsyncClient", return_value=instance):
        result = await client.set_cve_subscription(auth, "CVE-2024-1234", subscribed)
    assert instance.request.call_args.args == (method, "/api/cves/CVE-2024-1234/subscription")
    assert instance.request.call_args.kwargs["json"] is None
    assert json.loads(result) == payload


async def test_invalid_backend_json_is_tool_error(client, auth):
    response = httpx.Response(200, text="not JSON", request=httpx.Request("GET", "http://test"))
    with (
        patch("mcp_server.api_client.httpx.AsyncClient", return_value=_mock_client(response)),
        pytest.raises(ToolError, match="invalid JSON for GET /api/auth/me"),
    ):
        await client.get_me(auth)


def test_paginate_list_rejects_unexpected_response_shape():
    with pytest.raises(ToolError, match="unexpected list response"):
        _paginate_list('{"items": []}', 1, 20)
