# Configuration

Application configuration is environment-driven via `backend/app/config.py` (Pydantic Settings).

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_DB_URL` | `postgresql+asyncpg://postgres@localhost/rhacs_manager` | App DB URL (read-write) |
| `STACKROX_DB_URL` | `""` | Optional full StackRox DB URL; overrides component fields |
| `STACKROX_DB_HOST` | `localhost` | StackRox host |
| `STACKROX_DB_PORT` | `5432` | StackRox port |
| `STACKROX_DB_USER` | `postgres` | StackRox user |
| `STACKROX_DB_PASSWORD` | `""` | StackRox password |
| `STACKROX_DB_NAME` | `central_active` | StackRox DB name |

`STACKROX_DB_URL` is optional. If unset, the backend builds the effective URL from `STACKROX_DB_*` parts.

## Authentication

### Dev Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `DEV_MODE` | `true` | Enable local auth bypass |
| `DEV_USER_ID` | `dev-user-1` | Dev user ID |
| `DEV_USER_NAME` | `Dev User` | Dev display name |
| `DEV_USER_EMAIL` | `dev@example.com` | Dev email |
| `DEV_USER_ROLE` | `sec_team` | `sec_team` or `team_member` |
| `DEV_USER_NAMESPACES` | `""` | `ns1:cluster1,ns2:cluster2` |
| `DEV_NAMESPACE_EMAILS` | `""` | `ns1:cluster1=email@company.com,...` mapping for notifications |

### OIDC (Production)

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_ISSUER` | `""` | OIDC issuer URL |
| `OIDC_CLIENT_ID` | `""` | OIDC client ID |

### Spoke Proxy / Group Mapping

| Variable | Default | Description |
|----------|---------|-------------|
| `SPOKE_API_KEYS` | `[]` | JSON list of accepted spoke keys |
| `SEC_TEAM_GROUP` | `rhacs-sec-team` | Group mapped to `sec_team` |

## SMTP

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `localhost` | SMTP host |
| `SMTP_PORT` | `25` | SMTP port |
| `SMTP_FROM` | `rhacs-manager@example.com` | Sender |
| `SMTP_USER` | `""` | Username |
| `SMTP_PASSWORD` | `""` | Password |
| `SMTP_TLS` | `false` | Enable implicit TLS/SMTPS (typically port 465) |
| `SMTP_STARTTLS` | `true` | Enable STARTTLS upgrade (typically port 587) |
| `SMTP_VALIDATE_CERTS` | `true` | Validate SMTP TLS certificates |

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_BASE_URL` | `http://localhost:5173` | Base URL used in links and badge URLs |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | App signing key |
| `MANAGEMENT_EMAIL` | `""` | Recipient for weekly digest |

## Runtime Settings (`/api/settings`)

Security team users manage runtime behavior via API/UI. Values are stored in `global_settings`.

| Setting | Default | Description |
|---------|---------|-------------|
| `min_cvss_score` | `0.0` | Minimum CVSS threshold |
| `min_epss_score` | `0.0` | Minimum EPSS threshold |
| `escalation_rules` | Built-in defaults | Rule set for level escalation |
| `escalation_warning_days` | `3` | Lead time used for upcoming escalation warnings |
| `digest_day` | `0` | Weekly digest day (`0` = Monday) |
| `management_email` | `""` | Digest recipient (runtime override) |

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
