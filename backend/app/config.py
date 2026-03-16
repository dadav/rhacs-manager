from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App database (read-write)
    # Either set app_db_url directly, or set individual params below.
    # If app_db_url is empty, it is built from the individual params.
    app_db_url: str = Field(default="")
    app_db_host: str = Field(default="localhost")
    app_db_port: int = Field(default=5432)
    app_db_user: str = Field(default="postgres")
    app_db_password: str = Field(default="")
    app_db_name: str = Field(default="rhacs_manager")

    @property
    def effective_app_db_url(self) -> str:
        if self.app_db_url:
            return self.app_db_url
        cred = (
            f"{self.app_db_user}:{self.app_db_password}"
            if self.app_db_password
            else self.app_db_user
        )
        return f"postgresql+asyncpg://{cred}@{self.app_db_host}:{self.app_db_port}/{self.app_db_name}"

    # StackRox Central database (read-only)
    # Either set stackrox_db_url directly, or set individual params below.
    # If stackrox_db_url is empty, it is built from the individual params.
    stackrox_db_url: str = Field(default="")
    stackrox_db_host: str = Field(default="localhost")
    stackrox_db_port: int = Field(default=5432)
    stackrox_db_user: str = Field(default="postgres")
    stackrox_db_password: str = Field(default="")
    stackrox_db_name: str = Field(default="central_active")

    @property
    def effective_stackrox_db_url(self) -> str:
        if self.stackrox_db_url:
            return self.stackrox_db_url
        cred = (
            f"{self.stackrox_db_user}:{self.stackrox_db_password}"
            if self.stackrox_db_password
            else self.stackrox_db_user
        )
        return f"postgresql+asyncpg://{cred}@{self.stackrox_db_host}:{self.stackrox_db_port}/{self.stackrox_db_name}"

    # Auth — set dev_mode=true to skip OIDC and use mock user
    dev_mode: bool = Field(default=True)
    dev_user_id: str = Field(default="dev-user-1")
    dev_user_name: str = Field(default="Dev User")
    dev_user_email: str = Field(default="dev@example.com")
    dev_user_role: str = Field(default="sec_team")  # "sec_team" or "team_member"
    dev_user_namespaces: str = Field(default="")  # format: ns1:cluster1,ns2:cluster2
    dev_namespace_emails: str = Field(
        default=""
    )  # format: ns1:cluster1=email@example.com,ns2:cluster2=other@example.com

    # OIDC (production)
    oidc_issuer: str = Field(default="")
    oidc_client_id: str = Field(default="")

    # SMTP
    smtp_host: str = Field(default="localhost")
    smtp_port: int = Field(default=25)
    smtp_from: str = Field(default="rhacs-manager@example.com")
    smtp_user: str = Field(default="")
    smtp_password: str = Field(default="")
    smtp_tls: bool = Field(default=False)  # Implicit TLS (SMTPS, e.g. port 465)
    smtp_starttls: bool = Field(default=True)  # STARTTLS upgrade (e.g. port 587)
    smtp_validate_certs: bool = Field(default=True)  # TLS certificate validation

    # Spoke proxy auth (hub-spoke architecture)
    spoke_api_keys: list[str] = Field(
        default_factory=list
    )  # allowed API keys from spoke proxies
    sec_team_group: str = Field(
        default="rhacs-sec-team"
    )  # group granting sec_team role

    # Scheduler
    scheduler_enabled: bool = Field(default=True)

    # App
    app_base_url: str = Field(default="http://localhost:5173")
    badge_base_url: str = Field(
        default=""
    )  # Public base URL for badge SVGs (e.g. API route URL); empty = relative paths
    secret_key: str = Field(default="dev-secret-key-change-in-production")
    management_email: str = Field(default="")  # org-wide digest recipient
    default_escalation_email: str = Field(
        default=""
    )  # fallback escalation email for unannotated namespaces


settings = Settings()
