# RHACS CVE Manager — CLAUDE.md

Self-service CVE management app for OpenShift RHACS. Teams manage their own CVEs; sec team has org-wide visibility and a monitoring dashboard. EPSS-driven prioritization is the core design principle.

---

## Architecture

```
React/Vite (SPA, German) → FastAPI (Python 3.12) → StackRox Central DB (read-only)
                                                  → App DB (read-write)
                                                  → SMTP (email notifications)
```

- **Frontend**: `frontend/` — React 19, Vite, PatternFly 6, TanStack Query 5, react-i18next
- **Backend**: `backend/` — FastAPI, SQLAlchemy 2 async, Alembic, Pydantic v2, `uv`
- **Two databases**: StackRox Central (`central_active`, read-only) + own app DB (read-write)
- **Dev mode**: `DEV_MODE=true` bypasses OIDC; user is synced to DB from `DEV_USER_*` env vars

## Key Files

| Path | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app + lifespan |
| `backend/app/config.py` | Pydantic Settings (env-driven) |
| `backend/app/database.py` | Dual SQLAlchemy engine setup |
| `backend/app/auth/middleware.py` | OIDC + dev-mode auth; returns `CurrentUser` |
| `backend/app/stackrox/queries.py` | All read-only StackRox SQL queries |
| `backend/app/routers/` | API routers: auth, cves, dashboard, risk_acceptances, priorities, notifications, badges, settings, teams, audit, escalations, namespaces |
| `backend/app/models/` | SQLAlchemy ORM models (app DB) |
| `backend/app/tasks/scheduler.py` | APScheduler background jobs (escalation, digest) |
| `backend/app/badges/generator.py` | Pure Python SVG badge generator |
| `backend/alembic/versions/` | DB migrations |
| `frontend/src/api/client.ts` | Base API fetch; use `getErrorMessage` for errors |
| `frontend/src/utils/errors.ts` | `getErrorMessage(error)` — always use this for user-visible errors |
| `frontend/src/pages/` | One file per page/route |
| `frontend/src/components/` | Reusable UI components |
| `frontend/src/i18n/` | German translations |
| `deploy/base/` | Kustomize manifests (namespace, secret, deployments, routes) |
| `justfile` | Dev workflow commands |

## StackRox DB Query Pattern

**Always use `image_cves_v2`** — not the multi-table join via `image_cve_edges → image_cves → image_component_cve_edges`. The `image_cves_v2` view already joins CVE data with component and fixability info.

```sql
-- Correct pattern:
FROM deployments d
JOIN deployments_containers dc ON dc.deployments_id = d.id
JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
LEFT JOIN image_components comp ON comp.id = ic.componentid

-- Key fields on image_cves_v2:
-- ic.cvebaseinfo_cve, ic.severity, ic.cvss, ic.cvebaseinfo_epss_epssprobability
-- ic.impactscore, ic.firstimageoccurrence, ic.cvebaseinfo_publishedon, ic.isfixable, ic.fixedby
-- ic.imageid, ic.componentid
```

The old join chain (`image_cve_edges → image_cves → image_component_edges → image_component_cve_edges`) is incorrect for this schema.

For dashboard severity aggregation, querying `image_cves` via `image_cve_edges` can return empty/missing data in this project. Use `image_cves_v2` for `get_severity_distribution` as well, consistent with the other dashboard queries.

When building CVE list/detail aggregations, group by `ic.cvebaseinfo_cve` (CVE ID), not by `ic.id`. Grouping by `ic.id` creates duplicate rows for the same CVE and can make one prioritized CVE appear across many table rows.

Remaining legacy-table usage to review in `backend/app/stackrox/queries.py`: `get_epss_risk_matrix`, `get_cluster_heatmap`, `get_fixability_stats`, `get_cve_aging`, `get_threshold_preview`, `get_cves_by_ids`, and `get_namespaces_with_cve`.

## Frontend Error Handling

**Always use `getErrorMessage(error)` from `frontend/src/utils/errors.ts`** for all user-visible error text. Never use `(error as Error).message`.

FastAPI validation errors return `{ detail: [{ msg, loc, type }] }` — `getErrorMessage` handles all shapes: `Error` instances, `{ message }`, `{ detail: string }`, `{ detail: [...] }`, arrays, etc.

```tsx
// Correct
import { getErrorMessage } from '../utils/errors'
<Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />

// Wrong — do not do this
<Alert variant="danger" title={`Fehler: ${(error as Error).message}`} />
```

## PatternFly 6 Constraints

- `PageSectionVariants` only has `default` and `secondary` — no `light`
- `Label` colors: `'blue' | 'teal' | 'green' | 'orange' | 'purple' | 'red' | 'orangered' | 'grey' | 'yellow'` — no `gold`
- CSS import: `@patternfly/react-core/dist/styles/base.css` (declare `*.css` in `vite-env.d.ts`)
- CVE table priority indicator should use badge text `PRIO` and a theme-tolerant style (accent stripe + subtle tint) so it remains readable in dark mode and visible in light mode.
- Notification dropdown panels rendered from masthead actions must set an explicit text color when using a light background, otherwise masthead foreground inheritance can cause white-on-white content.

## Dev Workflow

```bash
# Run dev server as sec team user (default):
just dev

# Run as normal team member:
just dev user

# Run tests:
just test

# Lint:
just lint
```

Dev environment uses local Postgres. Set `APP_DB_URL` and `STACKROX_DB_URL` or rely on `justfile` defaults. Alembic migrations run automatically on `just dev`.

## Auth / Dev Mode

In dev mode (`DEV_MODE=true`), the middleware syncs the dev user from `DEV_USER_*` env vars into the DB on each request. `DEV_USER_ID` is ignored — the DB-assigned UUID is used. Team assignment comes from the DB unless `DEV_USER_TEAM_ID` is explicitly set.

## Data Model Highlights

- Teams own namespaces (`team_namespaces`). CVE visibility is scoped to team namespaces.
- CVSS/EPSS thresholds in `global_settings` filter CVEs from team views (sec team sees all).
- Manually prioritized CVEs and CVEs with active risk acceptances bypass threshold filtering.
- In `/cves`, prioritized CVEs must always be listed first regardless of selected sort column/direction.
- CVE API payloads expose both timeline dates from StackRox: `first_seen` (`ic.firstimageoccurrence`) and `published_on` (`ic.cvebaseinfo_publishedon`).
- CVE detail lifecycle timeline includes a dedicated "Veröffentlicht" step sourced from `published_on`, in addition to "Entdeckt" from `first_seen`.
- Risk acceptance creation is CVE-contextual only: users should start requests from CVE list/detail views; `/risikoakzeptanzen` is a list/review view and does not provide a standalone "new" action.
- Risk acceptances are scope-aware. `risk_acceptances.scope` uses:
  - `mode`: `all | namespace | image | deployment`
  - `targets`: `{ cluster_name, namespace, image_name?, deployment_id? }[]`
- Scope selections must be validated against real affected deployments for the CVE in the requesting team's namespaces.
- Active acceptances are unique by `(team_id, cve_id, scope_key)` where `scope_key` is a deterministic hash of normalized scope.
- Team dashboard (`/dashboard`) includes a dedicated `priority_cves` list in addition to `high_epss_cves`.
- Sec dashboard (`/sec-dashboard`) risk-acceptance pipeline rows are clickable deep links to `/risikoakzeptanzen?status=<requested|approved|rejected|expired>`.
- Risk acceptance list route (`/risikoakzeptanzen`) accepts a `status` query parameter and keeps filter state synced with the URL.
- `risk_acceptances.status`: `requested | approved | rejected | expired`
- `users.role`: `team_member | sec_team`

## Containers & Deploy

- Backend: `backend/Containerfile` (multi-stage, `uv sync --frozen`)
- Frontend: `frontend/Containerfile` (multi-stage, `npm run build`)
- Kustomize: `deploy/base/` — edit `deploy/base/secret.yaml` template before deploying
- All dependencies bundled at build time; no internet access at runtime

## Tests

```bash
# Backend (5 tests, all must pass):
uv run pytest tests/

# Frontend (TypeScript + Vite build must be clean):
npm run build
```

Always verify both before marking work done.
