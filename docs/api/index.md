# API Overview

RHACS CVE Manager exposes a REST API under `/api`.

## Base URLs

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:8000/api` |
| Hub | `https://<hub-api-route>/api` |
| Spoke | proxied through spoke nginx to hub |

## Authentication Order

1. `DEV_MODE=true` (dev-only bypass)
2. Spoke mode via `X-Api-Key`
3. OIDC bearer token

## Authorization

- `team_member`: namespace-scoped CVE visibility, risk acceptance requests, badge management
- `sec_team`: full administrative access (priorities, settings, audit, reviews)
- wildcard all-namespace users: still `team_member`, but with `X-Forwarded-Namespaces: *` / `has_all_namespaces=true` so they can query all namespaces without gaining sec-team-only permissions

## Response Patterns

- JSON payloads for all API routes
- Paginated responses:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 50
}
```

- Validation errors return FastAPI `detail` objects/arrays

## Health and OpenAPI

- `GET /health` (no auth)
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI JSON: `/openapi.json`

See [Endpoints](endpoints.md) for full contract details.
