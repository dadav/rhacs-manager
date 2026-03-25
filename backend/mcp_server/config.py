from pydantic_settings import BaseSettings


class McpSettings(BaseSettings):
    model_config = {"env_prefix": "MCP_"}

    backend_url: str = "http://localhost:8000"
    port: int = 8001
    readonly: bool = False


settings = McpSettings()
