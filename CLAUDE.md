# RHACS Manager - CLAUDE.md

Project guide for coding agents working in this repository. Keep changes aligned with the existing architecture and verify backend, frontend, and docs before handing work back.

## Mission

RHACS Manager is a self-service CVE management app for OpenShift RHACS.

- Regular users see CVEs only in namespaces they are allowed to access.
- Security team users see organization-wide data and can perform sec-team-only actions.
- EPSS-driven prioritization is a core product rule, not a reporting detail.

## Stack Snapshot

```text
React 19 + Vite SPA -> FastAPI (Python 3.12) -> StackRox Central DB (read-only)
                                           -> App DB (read-write)
                                           -> SMTP

Spoke mode:
OpenShift OAuth -> oauth-proxy -> auth-header-injector (Go) -> nginx -> hub backend
```

- Frontend: `frontend/` using React 19, TypeScript, Vite, PatternFly 6, TanStack Query 5, `react-i18next`, `bun`
- Backend: `backend/` using FastAPI, SQLAlchemy 2 async, Alembic, Pydantic v2, `uv`
- Auth sidecar: `auth-header-injector/` in Go
- Docs: MkDocs Material
- Deployment: Helm chart in `deploy/helm/rhacs-manager/`

## Fast Paths

```bash
# Install dependencies
just install

# Run full dev stack as sec-team user
just dev

# Run full dev stack as regular user
just dev user
just dev user payments:cluster-a

# Backend only
just dev-backend

# Frontend only
just dev-frontend

# Core verification
just test
just lint
just build-frontend
just docs-build
```

Notes:

- `just dev` and `just dev-backend` run Alembic migrations automatically.
- Local defaults in `justfile` use `rhacs_manager` for the app DB and `central_active` for the StackRox DB.
- `just check` runs backend tests, frontend type-check/lint, and frontend build, but not the docs build.

## Repo Map

| Path | Purpose |
| --- | --- |
| `backend/app/main.py` | FastAPI app entrypoint and router registration |
| `backend/app/config.py` | Environment-driven settings |
| `backend/app/database.py` | Dual database engine/session setup |
| `backend/app/auth/middleware.py` | Dev, spoke-proxy, and OIDC auth handling |
| `backend/app/stackrox/queries.py` | All read-only StackRox SQL |
| `backend/app/routers/` | API route modules |
| `backend/app/services/` | Business logic that should not live in routers |
| `backend/app/models/` | SQLAlchemy ORM models for app DB |
| `backend/app/tasks/scheduler.py` | APScheduler jobs |
| `backend/alembic/versions/` | Schema migrations |
| `frontend/src/api/client.ts` | Shared fetch wrapper |
| `frontend/src/utils/errors.ts` | Canonical user-visible error extraction |
| `frontend/src/pages/` | Route-level components, usually one file per route |
| `frontend/src/components/` | Shared UI pieces |
| `frontend/src/i18n/` | Translation JSON and i18n setup |
| `auth-header-injector/main.go` | Namespace and group resolution sidecar |
| `deploy/helm/rhacs-manager/` | Single supported deployment method |
| `docs/` | MkDocs content |
| `docs/stylesheets/extra.css` | Centralized docs styling overrides |
| `justfile` | Local workflow commands |

## Hard Invariants

### StackRox query rules

These rules are easy to break and cause silent data errors.

- Always use `image_cves_v2` for CVE data.
- Always use `image_component_v2` for component data.
- Do not use the legacy join chain through `image_cve_edges`, `image_cves`, or `image_component_cve_edges` for this project.
- Do not use `image_components` — its IDs are incompatible with `image_cves_v2.componentid` and joins silently return 0 rows.
- Join `image_component_v2.id` to `image_cves_v2.componentid`.
- Group CVE list and detail aggregations by `ic.cvebaseinfo_cve`, not by `ic.id`.

Correct pattern:

```sql
FROM deployments d
JOIN deployments_containers dc ON dc.deployments_id = d.id
JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
```

### Auth and visibility model

- There is no teams concept in the app.
- Namespace visibility comes from `X-Forwarded-Namespaces`, not from persisted team membership.
- Header format is `namespace:cluster` pairs separated by commas, or `*` for wildcard all-namespace access.
- `DEV_MODE=true` bypasses external auth and syncs the user from `DEV_USER_*` env vars.
- Spoke mode relies on `X-Api-Key` plus forwarded headers from the proxy chain.
- OIDC JWT mode can also supply namespaces from a JWT claim.

`CurrentUser` behavior:

- `namespaces` is request-scoped data and is not persisted in the DB.
- `is_sec_team` comes from the configured sec-team group.
- `has_all_namespaces` comes from wildcard namespace visibility.
- `can_see_all_namespaces` means `is_sec_team or has_all_namespaces`.

Access control rules:

- Sec team sees org-wide CVEs, escalations, risk acceptances, and sec-team-only actions.
- Wildcard all-namespace users are still `team_member`; they do not become sec team.
- Wildcard all-namespace users still obey CVSS and EPSS threshold filtering.
- Risk acceptances are visible if namespace scope overlaps or the user is the creator.
- Escalations are namespace-scoped.
- Badges are scoped by creator plus optional namespace and cluster.

### Product behavior rules

- CVSS and EPSS thresholds are conjunctive for non-sec-team visibility.
- Manually prioritized CVEs and CVEs with active risk acceptances bypass threshold filtering.
- Prioritized CVEs must always sort to the top in `/cves`, regardless of selected sort column.
- Dashboard chart datasets must apply the same visibility logic as `stat_total_cves`.
- Severity distribution must classify each visible CVE exactly once so the bucket sum matches `stat_total_cves`.
- Dashboard payload includes both `priority_cves` and `high_epss_cves`.

### CVE detail and workflow rules

- CVE payloads expose both `first_seen` and `published_on`.
- The detail timeline includes a dedicated `Veroeffentlicht` step sourced from `published_on`.
- CVE detail includes Red Hat and NVD links for each CVE ID.
- `contact_emails` in CVE detail should be deduplicated and include `DEFAULT_ESCALATION_EMAIL` as fallback when the user can see all namespaces.

### Risk acceptance rules

- Risk acceptance creation is CVE-contextual only.
- `/risk-acceptances` is a list and review surface, not a standalone create form.
- `risk_acceptances.scope` uses:
  - `mode`: `all | namespace | image | deployment`
  - `targets`: `{ cluster_name, namespace, image_name?, deployment_id? }[]`
- Scope targets must be validated against real affected deployments for that CVE in the user's visible namespaces.
- Active acceptances are unique by `(cve_id, scope_key)` where `scope_key` is a deterministic hash of normalized scope.
- Excel import groups rows by `(cve_id, justification)`, previews by default, and creates records only with `confirm=true`.

### Remediation rules

- Remediations are namespace-scoped and unique on `(cve_id, namespace, cluster_name)`.
- Status values: `open | in_progress | resolved | verified | wont_fix`
- Expected path is `open -> in_progress -> resolved -> verified`
- Only sec team verifies remediations.
- `wont_fix` requires a reason.
- Auto-resolution runs when StackRox no longer reports the CVE in that namespace.

### Badge URL rule

- Badge responses return relative paths by default.
- When `BADGE_BASE_URL` is set, API responses must return fully qualified badge URLs so external consumers can use the unauthenticated API route directly.

## Frontend Rules

- Always use `getErrorMessage(error)` from `frontend/src/utils/errors.ts` for user-visible errors.
- Do not use `(error as Error).message` directly in UI code.
- Keep route-level components in `frontend/src/pages/`.
- Shared API requests should go through `frontend/src/api/client.ts`.
- Keep translations aligned in `frontend/src/i18n/de.json` and `frontend/src/i18n/en.json`.
- The UI is German-first, but English translations also exist.

Example:

```tsx
import { getErrorMessage } from '../utils/errors'

<Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
```

## PatternFly 6 Constraints

- `PageSectionVariants` supports `default` and `secondary`, not `light`
- `Button` small size uses `size="sm"`, not `isSmall`
- `Label` color values: `blue | teal | green | orange | purple | red | orangered | grey | yellow` (no `gold`)
- Base CSS import is `@patternfly/react-core/dist/styles/base.css`
- Masthead dropdowns with light backgrounds must set an explicit text color
- Do not force `color: inherit` on `NavItem` links; it can break readable sidebar colors
- Keep sidebar colors mode-aware so both dark and light theme remain readable

## Backend Rules

- Keep StackRox SQL centralized in `backend/app/stackrox/queries.py`.
- Keep routers thin; move multi-step business rules into `backend/app/services/` when the logic is not purely request mapping.
- Scheduler startup and initial escalation check happen in the FastAPI lifespan.
- Dev-only routes are registered only when `DEV_MODE=true`.
- Alembic should resolve DB config through `app.config.settings.effective_app_db_url`, not a separate hardcoded fallback.

## Docs Rules

- Docs use MkDocs Material and are part of the expected verification surface.
- Keep docs styling centralized in `docs/stylesheets/extra.css`.
- Preserve the existing documentation structure instead of scattering one-off style overrides.

## Deployment Rules

- Helm is the single supported deployment method.
- Use the chart in `deploy/helm/rhacs-manager/` for both hub and spoke mode.
- Hub deployment requires the `central-db-password` secret in the `rhacs-manager` namespace.
- Hub frontend uses the same multi-container frontend pod pattern as spoke mode.
- Backend images are built with `uv` and rely on `[tool.uv] package = false`.
- `values.schema.json` is auto-generated by `helm-schema` from `values.yaml` annotations. Never edit it manually — regenerate it instead.

## Release and CI Notes

- Tag pushes (`v*`) create GitHub releases and publish images and Helm artifacts.
- CI includes Trivy image scans for backend, spoke frontend, and auth-header-injector.
- Keep release workflow changes conservative; the release pipeline is tightly coupled to image naming and tag formats.

## Verification Before Hand-off

Run the narrowest commands that still prove the change:

```bash
just test
just lint
just build-frontend
just docs-build
```

If the change only touches docs, at minimum run `just docs-build`. If the change touches frontend or backend behavior, run the relevant checks plus the docs build.
