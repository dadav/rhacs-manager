"""Tests for the MCP server tool registration and auth header extraction."""

import importlib
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from mcp_server.api_client import AuthContext


def _make_ctx(headers: dict[str, str] | None = None) -> MagicMock:
    """Build a mock MCP Context with the given request headers."""
    ctx = MagicMock()
    if headers is None:
        ctx.request_context.request = None
    else:
        request = MagicMock()
        request.headers = headers
        ctx.request_context.request = request
    return ctx


FORWARDED_HEADERS = {
    "x-forwarded-user": "testuser",
    "x-forwarded-groups": "group-a,group-b",
    "x-forwarded-namespaces": "payments:cluster-a",
    "x-forwarded-namespace-emails": "payments:cluster-a=team@example.com",
}


class TestExtractAuth:
    def test_valid_headers(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx(FORWARDED_HEADERS)
        auth = _extract_auth(ctx)
        assert auth.forwarded_user == "testuser"
        assert auth.forwarded_groups == "group-a,group-b"
        assert auth.forwarded_namespaces == "payments:cluster-a"
        assert auth.forwarded_namespace_emails == "payments:cluster-a=team@example.com"

    def test_missing_user_raises(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx({})
        with pytest.raises(ValueError, match="No X-Forwarded-User"):
            _extract_auth(ctx)

    def test_empty_user_raises(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx({"x-forwarded-user": ""})
        with pytest.raises(ValueError, match="No X-Forwarded-User"):
            _extract_auth(ctx)

    def test_no_request_context_raises(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx(None)
        with pytest.raises(ValueError, match="No request context"):
            _extract_auth(ctx)

    def test_missing_optional_headers_default_to_empty(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx({"x-forwarded-user": "testuser"})
        auth = _extract_auth(ctx)
        assert auth.forwarded_user == "testuser"
        assert auth.forwarded_groups == ""
        assert auth.forwarded_namespaces == ""
        assert auth.forwarded_namespace_emails == ""

    def test_wildcard_namespaces(self):
        from mcp_server.server import _extract_auth

        ctx = _make_ctx({"x-forwarded-user": "admin", "x-forwarded-namespaces": "*"})
        auth = _extract_auth(ctx)
        assert auth.forwarded_namespaces == "*"


class TestReadonlyMode:
    def test_readwrite_mode_has_all_tools(self):
        """In read-write mode, all 11 tools should be registered."""
        with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            tool_names = set(mcp_server.server.mcp._tool_manager._tools.keys())

            assert "get_security_overview" in tool_names
            assert "search_cves" in tool_names
            assert "get_cve_detail" in tool_names
            assert "get_cve_affected_deployments" in tool_names
            assert "get_image_layers" in tool_names
            assert "list_risk_acceptances" in tool_names
            assert "list_remediations" in tool_names
            assert "get_my_info" in tool_names
            assert "create_risk_acceptance" in tool_names
            assert "create_remediation" in tool_names
            assert "update_remediation_status" in tool_names
            assert len(tool_names) == 11

    def test_readonly_mode_excludes_write_tools(self):
        """In readonly mode, only 8 read-only tools should be registered."""
        with patch.dict("os.environ", {"MCP_READONLY": "true"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            tool_names = set(mcp_server.server.mcp._tool_manager._tools.keys())

            assert "get_security_overview" in tool_names
            assert "search_cves" in tool_names
            assert "get_cve_detail" in tool_names
            assert "get_cve_affected_deployments" in tool_names
            assert "get_image_layers" in tool_names
            assert "list_risk_acceptances" in tool_names
            assert "list_remediations" in tool_names
            assert "get_my_info" in tool_names
            assert "create_risk_acceptance" not in tool_names
            assert "create_remediation" not in tool_names
            assert "update_remediation_status" not in tool_names
            assert len(tool_names) == 8


class TestToolClientWiring:
    """Verify that tool functions call the correct API client methods."""

    @pytest.fixture
    def mock_ctx(self):
        return _make_ctx(FORWARDED_HEADERS)

    @pytest.fixture(autouse=True)
    def _reload_rw_mode(self):
        """Ensure server is loaded in read-write mode for wiring tests."""
        with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)
            yield

    async def test_get_security_overview_calls_dashboard(self, mock_ctx):
        from mcp_server.server import client, get_security_overview

        client.get_dashboard = AsyncMock(return_value='{"ok": true}')
        result = await get_security_overview(mock_ctx)
        call_auth = client.get_dashboard.call_args[0][0]
        assert isinstance(call_auth, AuthContext)
        assert call_auth.forwarded_user == "testuser"
        assert json.loads(result) == {"ok": True}

    async def test_search_cves_forwards_params(self, mock_ctx):
        from mcp_server.server import client, search_cves

        client.search_cves = AsyncMock(return_value='{"items": []}')
        await search_cves(mock_ctx, search="openssl", severity="critical", page=2, page_size=10)
        call_auth = client.search_cves.call_args[0][0]
        assert isinstance(call_auth, AuthContext)
        assert client.search_cves.call_args[1]["search"] == "openssl"
        assert client.search_cves.call_args[1]["severity"] == "critical"
        assert client.search_cves.call_args[1]["page"] == 2

    async def test_get_cve_detail_forwards_id(self, mock_ctx):
        from mcp_server.server import client, get_cve_detail

        client.get_cve = AsyncMock(return_value='{"cve_id": "CVE-2024-1234"}')
        result = await get_cve_detail(mock_ctx, cve_id="CVE-2024-1234")
        assert isinstance(client.get_cve.call_args[0][0], AuthContext)
        assert client.get_cve.call_args[0][1] == "CVE-2024-1234"
        assert "CVE-2024-1234" in result

    async def test_get_cve_affected_deployments_forwards_id(self, mock_ctx):
        from mcp_server.server import client, get_cve_affected_deployments

        client.get_cve_deployments = AsyncMock(return_value="[]")
        await get_cve_affected_deployments(mock_ctx, cve_id="CVE-2024-1234")
        assert client.get_cve_deployments.call_args[0][1] == "CVE-2024-1234"

    async def test_list_risk_acceptances_forwards_filters(self, mock_ctx):
        from mcp_server.server import client, list_risk_acceptances

        client.list_risk_acceptances = AsyncMock(return_value='{"items": []}')
        await list_risk_acceptances(mock_ctx, status="pending", cve_id="CVE-2024-1234")
        assert client.list_risk_acceptances.call_args[1]["status"] == "pending"
        assert client.list_risk_acceptances.call_args[1]["cve_id"] == "CVE-2024-1234"

    async def test_list_remediations_forwards_filters(self, mock_ctx):
        from mcp_server.server import client, list_remediations

        client.list_remediations = AsyncMock(return_value='{"items": []}')
        await list_remediations(mock_ctx, namespace="payments")
        assert client.list_remediations.call_args[1]["namespace"] == "payments"

    async def test_get_my_info_calls_me(self, mock_ctx):
        from mcp_server.server import client, get_my_info

        client.get_me = AsyncMock(return_value='{"username": "testuser"}')
        result = await get_my_info(mock_ctx)
        assert isinstance(client.get_me.call_args[0][0], AuthContext)
        assert "testuser" in result


class TestWriteToolWiring:
    """Verify write tool functions build correct payloads."""

    @pytest.fixture
    def mock_ctx(self):
        return _make_ctx(FORWARDED_HEADERS)

    @pytest.fixture(autouse=True)
    def _reload_rw_mode(self):
        with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)
            yield

    async def test_create_risk_acceptance_builds_payload(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.create_risk_acceptance = AsyncMock(return_value='{"id": "ra-1"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["create_risk_acceptance"].fn

        await tool_fn(
            mock_ctx,
            cve_id="CVE-2024-1234",
            justification="Low risk component",
            scope_mode="namespace",
            scope_targets=[{"cluster_name": "cluster-a", "namespace": "payments"}],
            expires_at="2025-12-31",
        )

        call_auth = mcp_server.server.client.create_risk_acceptance.call_args[0][0]
        assert isinstance(call_auth, AuthContext)
        assert call_auth.forwarded_user == "testuser"
        payload = mcp_server.server.client.create_risk_acceptance.call_args[0][1]
        assert payload["cve_id"] == "CVE-2024-1234"
        assert payload["justification"] == "Low risk component"
        assert payload["scope"]["mode"] == "namespace"
        assert payload["scope"]["targets"] == [{"cluster_name": "cluster-a", "namespace": "payments"}]
        assert payload["expires_at"] == "2025-12-31"

    async def test_create_risk_acceptance_omits_optional_fields(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.create_risk_acceptance = AsyncMock(return_value='{"id": "ra-2"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["create_risk_acceptance"].fn

        await tool_fn(
            mock_ctx,
            cve_id="CVE-2024-5678",
            justification="Not applicable",
        )

        payload = mcp_server.server.client.create_risk_acceptance.call_args[0][1]
        assert "expires_at" not in payload
        assert payload["scope"]["targets"] == []

    async def test_create_remediation_builds_payload(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.create_remediation = AsyncMock(return_value='{"id": "rem-1"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["create_remediation"].fn

        await tool_fn(
            mock_ctx,
            cve_id="CVE-2024-1234",
            namespace="payments",
            cluster_name="cluster-a",
            notes="Upgrading openssl",
        )

        call_auth = mcp_server.server.client.create_remediation.call_args[0][0]
        assert isinstance(call_auth, AuthContext)
        payload = mcp_server.server.client.create_remediation.call_args[0][1]
        assert payload["cve_id"] == "CVE-2024-1234"
        assert payload["namespace"] == "payments"
        assert payload["cluster_name"] == "cluster-a"
        assert payload["notes"] == "Upgrading openssl"
        assert "assigned_to" not in payload

    async def test_update_remediation_status_builds_payload(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.update_remediation = AsyncMock(return_value='{"status": "wont_fix"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["update_remediation_status"].fn

        await tool_fn(
            mock_ctx,
            remediation_id="rem-1",
            status="wont_fix",
            reason="Component will be removed next sprint",
        )

        call_args = mcp_server.server.client.update_remediation.call_args[0]
        assert isinstance(call_args[0], AuthContext)
        assert call_args[1] == "rem-1"
        payload = call_args[2]
        assert payload["status"] == "wont_fix"
        assert payload["wont_fix_reason"] == "Component will be removed next sprint"

    async def test_update_remediation_status_omits_reason_when_none(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.update_remediation = AsyncMock(return_value='{"status": "in_progress"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["update_remediation_status"].fn

        await tool_fn(
            mock_ctx,
            remediation_id="rem-1",
            status="in_progress",
        )

        payload = mcp_server.server.client.update_remediation.call_args[0][2]
        assert payload == {"status": "in_progress"}
        assert "wont_fix_reason" not in payload
