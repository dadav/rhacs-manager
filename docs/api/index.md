# API Overview

The RHACS CVE Manager backend exposes a REST API under the `/api` prefix. All API routes are served by FastAPI (Python 3.12).

## Base URL

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:8000/api` |
| Hub cluster | `https://<hub-route>/api` |
| Spoke cluster | Proxied through nginx to hub |

## Authentication

Every API request (except `/health` and badge SVGs) requires authentication. The backend evaluates auth in this order:

1. **Dev mode** (`DEV_MODE=true`) -- no headers needed, user from env vars
2. **Spoke proxy** -- `X-Api-Key` header with a valid spoke key
3. **OIDC JWT** -- `Authorization: Bearer <token>` header

### Role-Based Access

| Role | Description |
|------|-------------|
| `team_member` | Can view team-scoped CVEs, create risk acceptances, manage badges |
| `sec_team` | Full access: all CVEs, priorities, risk acceptance review, teams, settings, audit log |

Endpoints requiring `sec_team` return HTTP 403 for `team_member` users.

## Request Format

- Request bodies use JSON (`Content-Type: application/json`)
- Query parameters use standard URL encoding
- UUIDs are used for entity IDs

## Response Format

Successful responses return JSON. Paginated endpoints use this structure:

```json
{
    "items": [...],
    "total": 142,
    "page": 1,
    "page_size": 50
}
```

## Error Responses

Errors return a JSON body with a `detail` field:

```json
{
    "detail": "Nicht gefunden"
}
```

FastAPI validation errors return an array of error objects:

```json
{
    "detail": [
        {
            "loc": ["body", "cve_id"],
            "msg": "Field required",
            "type": "missing"
        }
    ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 409 | Conflict (duplicate resource) |

## Health Check

```
GET /health
```

Returns `{"status": "ok"}`. No authentication required. Used by Kubernetes readiness/liveness probes.

## OpenAPI Documentation

FastAPI auto-generates OpenAPI docs. In dev mode, access:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
