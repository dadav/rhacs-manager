"""Tests for MCP server configuration."""


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
