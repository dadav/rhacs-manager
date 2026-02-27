from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App database (read-write)
    app_db_url: str = Field(
        default="postgresql+asyncpg://postgres@localhost/rhacs_manager"
    )

    # StackRox Central database (read-only)
    stackrox_db_url: str = Field(
        default="postgresql+asyncpg://postgres@localhost/central_active"
    )

    # Auth — set dev_mode=true to skip OIDC and use mock user
    dev_mode: bool = Field(default=True)
    dev_user_id: str = Field(default="dev-user-1")
    dev_user_name: str = Field(default="Dev User")
    dev_user_email: str = Field(default="dev@example.com")
    dev_user_role: str = Field(default="sec_team")  # "sec_team" or "team_member"
    dev_user_team_id: str | None = Field(default=None)

    # OIDC (production)
    oidc_issuer: str = Field(default="")
    oidc_client_id: str = Field(default="")

    # SMTP
    smtp_host: str = Field(default="localhost")
    smtp_port: int = Field(default=25)
    smtp_from: str = Field(default="rhacs-manager@example.com")
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    smtp_tls: bool = Field(default=False)

    # App
    app_base_url: str = Field(default="http://localhost:5173")
    secret_key: str = Field(default="dev-secret-key-change-in-production")


settings = Settings()
