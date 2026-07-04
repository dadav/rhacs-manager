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


READ_ONLY_TOOLS = {
    "get_security_overview",
    "search_cves",
    "get_cves_by_image",
    "get_cve_detail",
    "get_image_layers",
    "list_risk_acceptances",
    "list_remediations",
    "get_my_info",
    "get_escalations",
    "get_settings",
}

WRITE_TOOLS = {
    "create_risk_acceptance",
    "create_remediation",
    "update_remediation_status",
    "request_cve_suppression",
}


class TestReadonlyMode:
    def test_readwrite_mode_has_all_tools(self):
        """In read-write mode, all read-only and write tools should be registered."""
        with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            tool_names = set(mcp_server.server.mcp._tool_manager._tools.keys())

            assert tool_names == READ_ONLY_TOOLS | WRITE_TOOLS

    def test_readonly_mode_excludes_write_tools(self):
        """In readonly mode, only read-only tools should be registered."""
        with patch.dict("os.environ", {"MCP_READONLY": "true"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            tool_names = set(mcp_server.server.mcp._tool_manager._tools.keys())

            assert tool_names == READ_ONLY_TOOLS
            assert not (tool_names & WRITE_TOOLS)


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

    async def test_search_cves_forwards_4_10_filters(self, mock_ctx):
        from mcp_server.server import client, search_cves

        client.search_cves = AsyncMock(return_value='{"items": []}')
        await search_cves(
            mock_ctx,
            fix_overdue=True,
            cvss_min=7.0,
            epss_min=0.5,
            prioritized_only=True,
            deployment="api",
            age_min=10,
        )
        kwargs = client.search_cves.call_args[1]
        assert kwargs["fix_overdue"] is True
        assert kwargs["cvss_min"] == 7.0
        assert kwargs["epss_min"] == 0.5
        assert kwargs["prioritized_only"] is True
        assert kwargs["deployment"] == "api"
        assert kwargs["age_min"] == 10

    async def test_get_escalations_default_lists_triggered(self, mock_ctx):
        from mcp_server.server import client, get_escalations

        client.list_escalations = AsyncMock(return_value="[]")
        client.get_upcoming_escalations = AsyncMock(return_value="[]")
        await get_escalations(mock_ctx, cluster="cluster-a", namespace="payments")
        assert client.list_escalations.call_args[1]["cluster"] == "cluster-a"
        assert client.list_escalations.call_args[1]["namespace"] == "payments"
        client.get_upcoming_escalations.assert_not_called()

    async def test_get_escalations_upcoming_calls_upcoming(self, mock_ctx):
        from mcp_server.server import client, get_escalations

        client.list_escalations = AsyncMock(return_value="[]")
        client.get_upcoming_escalations = AsyncMock(return_value="[]")
        await get_escalations(mock_ctx, upcoming=True, namespace="payments")
        assert client.get_upcoming_escalations.call_args[1]["namespace"] == "payments"
        assert client.get_upcoming_escalations.call_args[1]["cluster"] is None
        client.list_escalations.assert_not_called()

    async def test_get_settings_calls_settings(self, mock_ctx):
        from mcp_server.server import client, get_settings

        client.get_settings = AsyncMock(return_value='{"min_cvss_score": 0.0}')
        result = await get_settings(mock_ctx)
        assert isinstance(client.get_settings.call_args[0][0], AuthContext)
        assert "min_cvss_score" in result

    async def test_get_cves_by_image_forwards_filters(self, mock_ctx):
        from mcp_server.server import client, get_cves_by_image

        client.get_cves_by_image = AsyncMock(return_value="[]")
        await get_cves_by_image(
            mock_ctx,
            cluster="cluster-a",
            namespace="payments",
            severity="critical",
            fixable=True,
            image_name="quay.io/app",
        )
        kwargs = client.get_cves_by_image.call_args[1]
        assert kwargs["cluster"] == "cluster-a"
        assert kwargs["namespace"] == "payments"
        assert kwargs["severity"] == "critical"
        assert kwargs["fixable"] is True
        assert kwargs["image_name"] == "quay.io/app"


PROMPT_NAMES = {"triage_namespace", "investigate_cve", "weekly_security_review"}


class TestPromptRegistration:
    def test_prompts_are_registered(self):
        with patch.dict("os.environ", {"MCP_READONLY": "false"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            registered = set(mcp_server.server.mcp._prompt_manager._prompts.keys())
            assert registered >= PROMPT_NAMES

    def test_prompts_are_registered_in_readonly_mode_too(self):
        with patch.dict("os.environ", {"MCP_READONLY": "true"}, clear=False):
            import mcp_server.config
            import mcp_server.server

            importlib.reload(mcp_server.config)
            importlib.reload(mcp_server.server)

            registered = set(mcp_server.server.mcp._prompt_manager._prompts.keys())
            assert registered >= PROMPT_NAMES


class TestPromptRendering:
    def test_triage_namespace_includes_namespace_and_tools(self):
        from mcp_server.server import triage_namespace

        messages = triage_namespace(namespace="payments")
        assert len(messages) == 1
        text = messages[0].content.text
        assert "payments" in text
        # The prompt should reference the actual tool names so the LLM uses them.
        assert "search_cves" in text
        assert "fix_overdue" in text
        assert "get_escalations" in text
        assert "list_remediations" in text

    def test_triage_namespace_with_cluster_includes_cluster(self):
        from mcp_server.server import triage_namespace

        messages = triage_namespace(namespace="payments", cluster="cluster-a")
        text = messages[0].content.text
        assert "cluster-a" in text
        assert 'cluster="cluster-a"' in text

    def test_triage_namespace_without_cluster_omits_cluster_arg(self):
        from mcp_server.server import triage_namespace

        text = triage_namespace(namespace="payments")[0].content.text
        # No bare ``cluster=""`` in the rendered tool calls.
        assert 'cluster=""' not in text

    def test_investigate_cve_includes_id_and_tools(self):
        from mcp_server.server import investigate_cve

        text = investigate_cve(cve_id="CVE-2024-1234")[0].content.text
        assert "CVE-2024-1234" in text
        assert "get_cve_detail" in text
        assert "affected_deployments_list" in text
        assert "get_image_layers" in text
        assert "list_risk_acceptances" in text
        assert "list_remediations" in text

    def test_weekly_security_review_lists_tools(self):
        from mcp_server.server import weekly_security_review

        text = weekly_security_review()[0].content.text
        assert "get_security_overview" in text
        assert "get_escalations" in text
        assert "list_risk_acceptances" in text
        assert "list_remediations" in text


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

    async def test_request_cve_suppression_builds_payload(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.create_suppression_rule = AsyncMock(return_value='{"id": "sup-1"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["request_cve_suppression"].fn

        await tool_fn(
            mock_ctx,
            cve_id="CVE-2024-1234",
            reason="Not applicable: vulnerable code path is never invoked",
            scope_mode="namespace",
            scope_targets=[{"cluster_name": "cluster-a", "namespace": "payments"}],
        )

        call_auth = mcp_server.server.client.create_suppression_rule.call_args[0][0]
        assert isinstance(call_auth, AuthContext)
        payload = mcp_server.server.client.create_suppression_rule.call_args[0][1]
        assert payload["type"] == "cve"
        assert payload["cve_id"] == "CVE-2024-1234"
        assert payload["scope"]["mode"] == "namespace"
        assert payload["scope"]["targets"] == [{"cluster_name": "cluster-a", "namespace": "payments"}]
        assert "reference_url" not in payload

    async def test_request_cve_suppression_includes_reference_url(self, mock_ctx):
        import mcp_server.server

        mcp_server.server.client.create_suppression_rule = AsyncMock(return_value='{"id": "sup-2"}')

        tool_fn = mcp_server.server.mcp._tool_manager._tools["request_cve_suppression"].fn

        await tool_fn(
            mock_ctx,
            cve_id="CVE-2024-5678",
            reason="Vendor VEX marks this not affected",
            scope_mode="all",
            reference_url="https://vendor.example/vex/CVE-2024-5678",
        )

        payload = mcp_server.server.client.create_suppression_rule.call_args[0][1]
        assert payload["scope"]["mode"] == "all"
        assert payload["scope"]["targets"] == []
        assert payload["reference_url"] == "https://vendor.example/vex/CVE-2024-5678"
