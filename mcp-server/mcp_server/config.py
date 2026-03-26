import ssl
from pathlib import Path

from pydantic_settings import BaseSettings


class McpSettings(BaseSettings):
    model_config = {"env_prefix": "MCP_"}

    backend_url: str = "http://localhost:8000"
    port: int = 8001
    readonly: bool = False
    api_key: str = ""
    # Path to a CA bundle file for TLS verification, "false" to disable, or empty for default.
    ca_bundle: str = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"

    @property
    def ssl_verify(self) -> ssl.SSLContext | bool:
        """Return the value to pass to httpx's ``verify`` parameter."""
        if not self.ca_bundle:
            return True
        if self.ca_bundle.lower() == "false":
            return False
        ca_path = Path(self.ca_bundle)
        if not ca_path.exists():
            return True
        ctx = ssl.create_default_context(cafile=str(ca_path))
        return ctx


settings = McpSettings()
