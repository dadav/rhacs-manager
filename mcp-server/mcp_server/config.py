import logging
import ssl
from pathlib import Path

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class McpSettings(BaseSettings):
    model_config = {"env_prefix": "MCP_"}

    backend_url: str = "http://localhost:8000"
    port: int = 8001
    readonly: bool = False
    api_key: str = ""
    # Path to a CA bundle file for TLS verification, "false" to disable, or empty for default.
    ca_bundle: str = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
    # Logging level: debug, info, warning, error, critical
    log_level: str = "info"

    @property
    def ssl_verify(self) -> ssl.SSLContext | bool:
        """Return the value to pass to httpx's ``verify`` parameter."""
        if not self.ca_bundle:
            logger.debug("CA bundle not set, using default SSL verification")
            return True
        if self.ca_bundle.lower() == "false":
            logger.debug("SSL verification disabled via MCP_CA_BUNDLE=false")
            return False
        ca_path = Path(self.ca_bundle)
        if not ca_path.exists():
            logger.debug("CA bundle %s not found, falling back to default SSL verification", self.ca_bundle)
            return True
        logger.debug("Loading CA bundle from %s", self.ca_bundle)
        ctx = ssl.create_default_context()
        ctx.load_verify_locations(cafile=str(ca_path))
        return ctx


settings = McpSettings()
