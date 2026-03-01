# Configuration

All configuration is driven by environment variables, loaded via Pydantic Settings (`backend/app/config.py`). Variables can also be set in a `.env` file in the backend directory.

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_DB_URL` | `postgresql+asyncpg://postgres@localhost/rhacs_manager` | App database connection string (read-write) |
| `STACKROX_DB_URL` | `postgresql+asyncpg://postgres@localhost/central_active` | StackRox Central database connection string (read-only) |

Both databases use `asyncpg` with connection pool pre-ping enabled.

## Authentication

### Dev Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `DEV_MODE` | `true` | Enable dev mode (bypasses OIDC, uses mock user) |
| `DEV_USER_ID` | `dev-user-1` | Dev user identifier (ignored -- DB-assigned UUID is used) |
| `DEV_USER_NAME` | `Dev User` | Dev user display name |
| `DEV_USER_EMAIL` | `dev@example.com` | Dev user email |
| `DEV_USER_ROLE` | `sec_team` | Dev user role: `sec_team` or `team_member` |
| `DEV_USER_NAMESPACES` | `""` | Namespace access in dev mode (format: `ns1:cluster1,ns2:cluster2`) |

!!! warning
    Set `DEV_MODE=false` in production. Dev mode bypasses all authentication and creates a synthetic user on every request.

### OIDC (Production)

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_ISSUER` | `""` | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | `""` | OIDC client ID for token validation |

### Spoke Proxy

| Variable | Default | Description |
|----------|---------|-------------|
| `SPOKE_API_KEYS` | `[]` | JSON list of allowed API keys from spoke proxies. Example: `'["key1","key2"]'` |
| `SEC_TEAM_GROUP` | `rhacs-sec-team` | Keycloak group name that grants the `sec_team` role |

!!! note "Namespace access"
    Namespace access for spoke users is determined by the namespace-resolver sidecar, which reads K8s namespace annotations (`rhacs-manager.io/users`) and sets the `X-Forwarded-Namespaces` header. There is no group-to-team mapping -- groups only determine the user's role.

## SMTP (Email)

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `localhost` | SMTP server hostname |
| `SMTP_PORT` | `25` | SMTP server port |
| `SMTP_FROM` | `rhacs-manager@example.com` | Sender email address |
| `SMTP_USER` | `""` | SMTP authentication username |
| `SMTP_PASSWORD` | `""` | SMTP authentication password |
| `SMTP_TLS` | `false` | Enable STARTTLS |

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_BASE_URL` | `http://localhost:5173` | Base URL for links in emails and badge URLs |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | JWT signing key |
| `MANAGEMENT_EMAIL` | `""` | Email address for org-wide weekly digest reports |

!!! danger
    Change `SECRET_KEY` to a strong random value in production. The default is insecure.

## Runtime Settings (Global Settings)

These are configured through the API (`/api/settings`) by the security team, not via environment variables. They are stored in the `global_settings` table.

| Setting | Default | Description |
|---------|---------|-------------|
| `min_cvss_score` | `0.0` | Minimum CVSS score for CVE visibility (0.0-10.0) |
| `min_epss_score` | `0.0` | Minimum EPSS probability for CVE visibility (0.0-1.0) |
| `escalation_rules` | _(see below)_ | JSON array of escalation rule definitions |
| `digest_day` | `0` (Monday) | Day of week for weekly digest email (0=Monday) |
| `management_email` | `""` | Email address for management digest reports |

### Default Escalation Rules

```json
[
    {
        "severity_min": 3,
        "epss_threshold": 0.0,
        "days_to_level1": 14,
        "days_to_level2": 21,
        "days_to_level3": 30
    },
    {
        "severity_min": 4,
        "epss_threshold": 0.0,
        "days_to_level1": 7,
        "days_to_level2": 14,
        "days_to_level3": 21
    },
    {
        "severity_min": 2,
        "epss_threshold": 0.5,
        "days_to_level1": 14,
        "days_to_level2": 21,
        "days_to_level3": 30
    }
]
```

Severity values: `1` = Low, `2` = Moderate, `3` = Important, `4` = Critical.

## Spoke Frontend Environment

These variables are used by the spoke nginx container (set via `rhacs-manager-spoke-secret`):

| Variable | Description |
|----------|-------------|
| `HUB_API_URL` | Full URL of the hub backend API route (e.g. `https://rhacs-manager-api.hub.example.com`) |
| `SPOKE_API_KEY` | API key matching one of the hub's `SPOKE_API_KEYS` entries |
| `CLUSTER_NAME` | Name of the spoke cluster (used by namespace-resolver for namespace:cluster pairs) |

These are substituted into the nginx config at container startup via `envsubst`.
