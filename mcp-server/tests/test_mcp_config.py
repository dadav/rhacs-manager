"""Tests for MCP server configuration."""

from unittest.mock import Mock, patch


class TestMcpSettings:
    def test_defaults(self):
        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.backend_url == "http://localhost:8000"
        assert s.port == 8001
        assert s.readonly is False

    def test_env_override(self, monkeypatch):
        monkeypatch.setenv("MCP_BACKEND_URL", "http://backend:9000")
        monkeypatch.setenv("MCP_PORT", "9999")
        monkeypatch.setenv("MCP_READONLY", "true")

        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.backend_url == "http://backend:9000"
        assert s.port == 9999
        assert s.readonly is True

    def test_readonly_false_string(self, monkeypatch):
        monkeypatch.setenv("MCP_READONLY", "false")

        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.readonly is False

    def test_ssl_verify_false_string(self, monkeypatch):
        monkeypatch.setenv("MCP_CA_BUNDLE", "false")

        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.ssl_verify is False

    def test_ssl_verify_missing_bundle_uses_default_store(self, monkeypatch):
        monkeypatch.setenv("MCP_CA_BUNDLE", "/tmp/does-not-exist.pem")

        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.ssl_verify is True

    def test_log_level_default(self):
        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.log_level == "info"

    def test_log_level_env_override(self, monkeypatch):
        monkeypatch.setenv("MCP_LOG_LEVEL", "debug")

        from mcp_server.config import McpSettings

        s = McpSettings()
        assert s.log_level == "debug"

    def test_ssl_verify_adds_bundle_to_default_store(self, monkeypatch):
        monkeypatch.setenv("MCP_CA_BUNDLE", "/tmp/custom-ca.pem")

        from mcp_server.config import McpSettings

        mock_ctx = Mock()
        with patch("mcp_server.config.Path.exists", return_value=True):
            with patch("mcp_server.config.ssl.create_default_context", return_value=mock_ctx) as create_context:
                s = McpSettings()
                assert s.ssl_verify is mock_ctx

        create_context.assert_called_once_with()
        mock_ctx.load_verify_locations.assert_called_once_with(cafile="/tmp/custom-ca.pem")
