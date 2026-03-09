# RHACS CVE Manager — CLAUDE.md

Self-service CVE management app for OpenShift RHACS. Users see CVEs scoped to their K8s RBAC-accessible namespaces; sec team has org-wide visibility. All dashboard charts (EPSS matrix, cluster heatmap, aging distribution, RA pipeline) are available to all users, namespace-scoped for non-sec users. EPSS-driven prioritization is the core design principle.

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
- **No teams**: Namespace access is derived from K8s namespace annotations via `X-Forwarded-Namespaces` header
- **Auth header injector**: `auth-header-injector/` — Go sidecar that reads namespace annotations and sets `X-Forwarded-Namespaces`

## Key Files

| Path                                 | Purpose                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/main.py`                | FastAPI app + lifespan                                                                                                            |
| `backend/app/config.py`              | Pydantic Settings (env-driven)                                                                                                    |
| `backend/app/database.py`            | Dual SQLAlchemy engine setup                                                                                                      |
| `backend/app/auth/middleware.py`     | Three-mode auth (dev / spoke-proxy / OIDC JWT); returns `CurrentUser` with `namespaces`                                           |
| `backend/app/auth/group_mapping.py`  | Resolves sec_team role from Keycloak groups                                                                                       |
| `backend/app/stackrox/queries.py`    | All read-only StackRox SQL queries                                                                                                |
| `backend/app/routers/`               | API routers: auth, cves, dashboard, risk_acceptances, priorities, notifications, badges, settings, audit, escalations, remediations, namespaces |
| `backend/app/models/`                | SQLAlchemy ORM models (app DB)                                                                                                    |
| `backend/app/tasks/scheduler.py`     | APScheduler background jobs (escalation, digest)                                                                                  |
| `backend/app/badges/generator.py`    | Pure Python SVG badge generator                                                                                                   |
| `backend/alembic/versions/`          | DB migrations                                                                                                                     |
| `frontend/src/api/client.ts`         | Base API fetch; use `getErrorMessage` for errors                                                                                  |
| `frontend/src/utils/errors.ts`       | `getErrorMessage(error)` — always use this for user-visible errors                                                                |
| `frontend/src/pages/`                | One file per page/route                                                                                                           |
| `frontend/src/components/`           | Reusable UI components                                                                                                            |
| `frontend/src/i18n/`                 | German translations                                                                                                               |
| `deploy/helm/rhacs-manager/`         | Helm chart for hub and spoke deployment (`--set mode=spoke`)                                                                      |
| `auth-header-injector/main.go`       | Go sidecar: resolves namespace annotations to `X-Forwarded-Namespaces` header                                                     |
| `auth-header-injector/Containerfile` | Multi-stage build for auth-header-injector (distroless runtime)                                                                   |
| `frontend/Containerfile`             | Spoke frontend image (nginx with API proxy to hub)                                                                                |
| `frontend/nginx.conf.spoke`          | Spoke nginx template (envsubst for HUB_API_URL, SPOKE_API_KEY)                                                                    |
| `docs/`                              | MkDocs Material documentation site                                                                                                |
| `docs/stylesheets/extra.css`         | Custom docs theming for homepage/visual polish                                                                                    |
| `mkdocs.yml`                         | Docs site config (Material theme features, markdown extensions, nav)                                                              |
| `justfile`                           | Dev workflow commands                                                                                                             |

## Documentation Stack

- Documentation is built with **MkDocs + Material for MkDocs**.
- `mkdocs.yml` enables modern Material features (`navigation.instant`, `search.share`, `content.action.*`, etc.).
- Custom docs styling is intentionally centralized in `docs/stylesheets/extra.css`.
- Homepage layout uses Material card-grid/button patterns (`docs/index.md`) for predictable LLM-friendly regeneration.
- Docs validation command: `just docs-build` (or `uv run --with mkdocs-material mkdocs build`).

## StackRox DB Query Pattern

**Always use `image_cves_v2`** — not the multi-table join via `image_cve_edges → image_cves → image_component_cve_edges`. The `image_cves_v2` view already joins CVE data with component and fixability info.

**Always use `image_component_v2`** for component data — not `image_components`. The `image_component_v2.id` matches `image_cves_v2.componentid`; the old `image_components.id` uses a different format and joins will silently return 0 rows.

```sql
-- Correct pattern:
FROM deployments d
JOIN deployments_containers dc ON dc.deployments_id = d.id
JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid

-- Key fields on image_cves_v2:
-- ic.cvebaseinfo_cve, ic.severity, ic.cvss, ic.cvebaseinfo_epss_epssprobability
-- ic.impactscore, ic.firstimageoccurrence, ic.cvebaseinfo_publishedon, ic.isfixable, ic.fixedby
-- ic.imageid, ic.componentid

-- Key fields on image_component_v2:
-- comp.name, comp.version, comp.operatingsystem, comp.riskscore, comp.topcvss
```

The old join chain (`image_cve_edges → image_cves → image_component_edges → image_component_cve_edges`) is incorrect for this schema. Similarly, `image_components` has incompatible IDs — always use `image_component_v2`.

For dashboard severity aggregation, querying `image_cves` via `image_cve_edges` can return empty/missing data in this project. Use `image_cves_v2` for `get_severity_distribution` as well, consistent with the other dashboard queries.

When building CVE list/detail aggregations, group by `ic.cvebaseinfo_cve` (CVE ID), not by `ic.id`. Grouping by `ic.id` creates duplicate rows for the same CVE and can make one prioritized CVE appear across many table rows.

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
- `Button` uses `size="sm"` for small buttons (not `isSmall` — removed in PF6).
- For PatternFly `NavItem` + `react-router-dom` `Link` children, do not set inline `color: inherit`; it can override PF nav-link color tokens and make sidebar text unreadable in light mode.
- Sidebar nav colors must be mode-aware: keep dark-sidebar link colors for dark mode, but override link/title/active colors in light mode for readable contrast, especially in mobile overlay navigation.

## Dev Workflow

```bash
# Run dev server as sec team user (default):
just dev

# Run as normal team member:
just dev user
just dev user payments:cluster-a
just dev user payments:cluster-a inventory:cluster-a

# Run tests:
just test

# Lint:
just lint
```

Dev environment uses local Postgres. Set `APP_DB_URL` and `STACKROX_DB_URL` or rely on `justfile` defaults. Alembic migrations run automatically on `just dev`.

## Auth Model (K8s RBAC-Derived Namespaces)

**No teams concept.** Namespace access is derived from Kubernetes RBAC and delivered via `X-Forwarded-Namespaces` header.

**Header format:** `X-Forwarded-Namespaces: ns1:cluster1,ns2:cluster2,...` or `*` (wildcard = all namespaces)

The spoke proxy is responsible for querying namespace annotations and populating this header.

**`CurrentUser` carries:**

- `id`, `username`, `email`, `role` (persisted in DB)
- `namespaces: list[tuple[str, str]]` (from header, NOT persisted)
- `is_sec_team` (from `sec_team_group` config via `X-Forwarded-Groups`)
- `has_all_namespaces` (from wildcard `*` in `X-Forwarded-Namespaces`)
- `can_see_all_namespaces` (property: `is_sec_team or has_all_namespaces`)

**Auth modes:**

1. **Dev mode** (`DEV_MODE=true`): namespaces from `DEV_USER_NAMESPACES` env var (format: `ns1:cluster1,ns2:cluster2` or `*` for all)
2. **Spoke proxy** (`X-Api-Key`): namespaces from `X-Forwarded-Namespaces` header, role from `X-Forwarded-Groups`
3. **OIDC JWT**: namespaces from JWT `namespaces` claim (if available)

**Access control:**

- Sec team sees all CVEs, escalations, risk acceptances (org-wide)
- Users with `has_all_namespaces` (via `ALL_NAMESPACES_GROUPS`) see all namespaces but without sec_team authorization (cannot approve RAs, verify remediations) and still have CVSS/EPSS thresholds applied
- Non-sec users see only CVEs in their namespaces
- Risk acceptances: accessible if user's namespaces overlap with RA's scope targets, or user is the RA creator
- Escalations: namespace-scoped (filter by user's namespace list)
- Badges: scoped by creator (user) and specific namespace/cluster

**Config (hub backend env vars):**

- `SPOKE_API_KEYS`: JSON list of allowed API keys, e.g. `'["key1","key2"]'`
- `SEC_TEAM_GROUP`: group name granting sec_team role (default: `rhacs-sec-team`)
- `DEV_USER_NAMESPACES`: dev mode namespace access (format: `ns1:cluster1,ns2:cluster2` or `*` for all)
- `MANAGEMENT_EMAIL`: org-wide weekly digest recipient
- `DEFAULT_ESCALATION_EMAIL`: fallback escalation email for namespaces without `rhacs-manager.io/escalation-email` annotation
- `BADGE_BASE_URL`: public base URL for badge SVGs (e.g. API route URL `https://rhacs-manager-api.apps.example.com`); empty = relative paths
- SMTP transport toggles:
  - `SMTP_TLS`: implicit TLS/SMTPS (usually port 465)
  - `SMTP_STARTTLS`: STARTTLS upgrade (usually port 587)
  - `SMTP_VALIDATE_CERTS`: TLS certificate verification toggle (set `false` for self-signed/mismatched cert setups)

## Hub-Spoke Architecture

RHACS runs on a hub cluster (admin-only) with spoke clusters per user group. Spoke users authenticate via OpenShift OAuth (Keycloak-backed) and never need hub access.

```
SPOKE CLUSTER                                      HUB CLUSTER
Route → oauth-proxy → auth-header-injector → nginx  →→  Route → FastAPI backend
       (OpenShift OAuth)  :8081 (Go sidecar)  :8080    (X-Api-Key + X-Forwarded-*)
                          sets X-Forwarded-Namespaces
```

**Auth flow (spoke proxy mode):**

1. oauth-proxy handles OpenShift OAuth login, injects `X-Forwarded-User/Email/Groups/Access-Token` headers
2. auth-header-injector sidecar reads `X-Forwarded-User`, looks up user-based (`rhacs-manager.io/users`) and group-based (`rhacs-manager.io/groups`) namespace annotations, plus namespace escalation contact annotation (`rhacs-manager.io/escalation-email`)
3. If `X-Forwarded-Access-Token` is present, auth-header-injector calls OpenShift user API (`/apis/user.openshift.io/v1/users/~`) to resolve the user's groups, then merges group-based namespaces with user-based namespaces
4. auth-header-injector sets `X-Forwarded-Namespaces` (merged, deduplicated), `X-Forwarded-Namespace-Emails` (`ns:cluster=email`), and `X-Forwarded-Groups` (from OpenShift user API)
5. Spoke nginx serves SPA, proxies `/api/*` to hub route with `X-Api-Key` + forwarded headers
6. Hub backend validates API key (`settings.spoke_api_keys`), reads identity + namespaces + groups from headers
7. `sec_team_group` in groups grants sec_team role
8. Users auto-provisioned with ID `spoke:<username>`

**Auth header injector** (`auth-header-injector/`):

- Go sidecar sitting between oauth-proxy (:8443) and nginx (:8080) on port :8081
- Caches `namespace → []username` and `namespace → []group` maps from K8s namespace annotations (refreshed every `CACHE_TTL_SECONDS`, default 300)
- User annotation format: `rhacs-manager.io/users: user1,user2,user3` on any namespace
- Group annotation format: `rhacs-manager.io/groups: group1,group2` on any namespace — all members of listed groups get access
- Escalation contact annotation format: `rhacs-manager.io/escalation-email: team@example.com` on any namespace
- Groups are resolved by calling the OpenShift user API with the forwarded access token (cached per token for `GROUP_CACHE_TTL_SECONDS`, default 60)
- Config env vars: `CLUSTER_NAME` (required), `NAMESPACE_ANNOTATION` (default: `rhacs-manager.io/users`), `GROUP_ANNOTATION` (default: `rhacs-manager.io/groups`), `EMAIL_ANNOTATION` (default: `rhacs-manager.io/escalation-email`), `CACHE_TTL_SECONDS` (default: `300`), `GROUP_CACHE_TTL_SECONDS` (default: `60`), `KUBE_API_URL` (default: `https://kubernetes.default.svc`), `ALL_NAMESPACES_GROUPS` (comma-separated group names that receive wildcard `*` namespace access instead of enumerated namespaces)
- Requires ClusterRole with `list` on `namespaces` (included in Helm chart)

**Deploy:**

- Hub: `helm upgrade --install rhacs-manager deploy/helm/rhacs-manager -n rhacs-manager --create-namespace`
- Spoke: `helm upgrade --install rhacs-manager-spoke deploy/helm/rhacs-manager -n rhacs-manager --create-namespace --set mode=spoke`
- Plain YAML: `just render-hub` / `just render-spoke` for `helm template` output

## Data Model Highlights

- CVE visibility is scoped by user's namespaces (from `X-Forwarded-Namespaces` header).
- CVSS/EPSS thresholds in `global_settings` filter CVEs from non-sec views (sec team sees all; `has_all_namespaces` users still have thresholds applied).
- Threshold evaluation is conjunctive: CVEs must meet both `min_cvss_score` and `min_epss_score` unless bypassed by manual priority or active risk acceptance.
- Manually prioritized CVEs and CVEs with active risk acceptances bypass threshold filtering.
- In `/cves`, prioritized CVEs must always be listed first regardless of selected sort column/direction.
- CVE API payloads expose both timeline dates from StackRox: `first_seen` (`ic.firstimageoccurrence`) and `published_on` (`ic.cvebaseinfo_publishedon`).
- CVE detail lifecycle timeline includes a dedicated "Veröffentlicht" step sourced from `published_on`, in addition to "Entdeckt" from `first_seen`.
- CVE detail view includes external reference links for each CVE ID: Red Hat (`https://access.redhat.com/security/cve/<CVE-ID>`) and NVD (`https://nvd.nist.gov/vuln/detail/<CVE-ID>`).
- CVE detail API now includes `contact_emails` (deduplicated `namespace_contacts.escalation_email` values) and the detail UI renders them as mailto links; values are populated for users with `can_see_all_namespaces`. For namespaces without explicit contacts, `DEFAULT_ESCALATION_EMAIL` is included as fallback.
- Risk acceptance creation is CVE-contextual only: users should start requests from CVE list/detail views; `/risikoakzeptanzen` is a list/review view and does not provide a standalone "new" action.
- Risk acceptances are scope-aware. `risk_acceptances.scope` uses:
  - `mode`: `all | namespace | image | deployment`
  - `targets`: `{ cluster_name, namespace, image_name?, deployment_id? }[]`
- Scope selections must be validated against real affected deployments for the CVE in the user's namespaces.
- Active acceptances are unique by `(cve_id, scope_key)` where `scope_key` is a deterministic hash of normalized scope.
- Dashboard (`/dashboard`) includes a dedicated `priority_cves` list in addition to `high_epss_cves`.
- Dashboard stat cards are: `Gesamt CVEs`, `Eskalationen`, `Behebbare kritische CVEs`, and `Offene Risikoakzeptanzen`.
- Dashboard chart datasets (`severity_distribution`, `cves_per_namespace`) must apply the same visibility logic as `stat_total_cves` (CVSS/EPSS thresholds plus always-show CVEs from priorities/active risk acceptances).
- Severity distribution must classify each visible CVE into exactly one bucket (use aggregated severity per CVE) so the bucket total matches `stat_total_cves`.
- Dashboard risk-acceptance pipeline (sec team only) rows are clickable deep links to `/risikoakzeptanzen?status=<requested|approved|rejected|expired>`.
- Risk acceptance list route (`/risikoakzeptanzen`) accepts a `status` query parameter and keeps filter state synced with the URL.
- Escalations are namespace-scoped (`cve_id`, `namespace`, `cluster_name`, `level`).
- Badges are scoped by `created_by` (user) + optional `namespace`/`cluster_name`.
- Badge API responses return relative paths by default (`/api/badges/{token}/status.svg`), but when `BADGE_BASE_URL` is set (e.g. to the API route URL), returns fully qualified URLs. This is required on OpenShift where the frontend route goes through oauth-proxy — external badge consumers need to hit the API route directly (no auth). Frontend handles both absolute and relative badge URLs.
- `risk_acceptances.status`: `requested | approved | rejected | expired`
- `remediations` track active CVE fix efforts, namespace-scoped: unique on `(cve_id, namespace, cluster_name)`.
- `remediations.status`: `open | in_progress | resolved | verified | wont_fix`
- Remediation workflow: `open → in_progress → resolved → verified` (sec team only verifies). `wont_fix` requires reason.
- Remediation creation is CVE-contextual: users create from CVE detail page, selecting a namespace.
- Scheduler auto-resolves remediations when StackRox no longer shows the CVE in the namespace's deployments.
- Scheduler sends overdue notifications for remediations past their `target_date`.
- `/behebungen` page lists all remediations with status/overdue filters and stat cards.
- CVE detail page shows a "Behebungen" section with per-namespace remediation cards and inline status transitions.
- `users.role`: `team_member | sec_team`

## Containers & Deploy

- Backend: `backend/Containerfile` (multi-stage, `uv sync --frozen`) — hub only
- Frontend spoke: `frontend/Containerfile` (adds envsubst + API proxy nginx) — used for both hub and spoke deployments
- Helm chart: `deploy/helm/rhacs-manager/` — supports hub (default) and spoke (`--set mode=spoke`) modes
- Hub deployment prerequisite: copy `central-db-password` secret from `stackrox` namespace into `rhacs-manager` namespace (backend reads `STACKROX_DB_PASSWORD` from this secret)
- Hub frontend uses the same 3-container pod as spoke (oauth-proxy + auth-header-injector + spoke-nginx), with `HUB_API_URL=http://rhacs-manager-backend:8000` pointing to the local backend service
- All dependencies bundled at build time; no internet access at runtime
- Backend `uv` config sets `[tool.uv] package = false` to avoid packaging the local app in runtime images. This prevents offline runtime resolution errors for build backends like `hatchling` when starting with `uv run --offline`.
- Alembic DB URL resolution is sourced from `app.config.settings.effective_app_db_url` (not a hardcoded `APP_DB_URL` fallback), so deployments using split env vars (`APP_DB_HOST`, `APP_DB_USER`, `APP_DB_PASSWORD`, `APP_DB_NAME`) work for migrations and runtime consistently.
- Tag pushes (`v*`) in `.github/workflows/build.yaml` now create a GitHub Release automatically after image/chart builds. Release notes are generated with `orhun/git-cliff-action@v4` using `cliff.toml` (`--current` for the checked-out tag), then append Trivy vulnerability summaries (severity totals + top HIGH/CRITICAL findings) for backend, spoke, and auth-header-injector images. Raw Trivy JSON reports are attached to the release.
- Build image tagging in `.github/workflows/build.yaml` publishes both semver tag forms on release tags (e.g. `0.4.3` and `v0.4.3`, plus matching minor tags) to avoid release-time tag lookup mismatches.
- Release-time Trivy scans use direct image refs derived from `${{ github.ref_name }}` (`BACKEND_IMAGE`/`SPOKE_IMAGE`/`AUTH_HEADER_INJECTOR_IMAGE`) in the create-release job; dual semver tagging keeps these refs resolvable.
- `git-cliff` header templates do not expose `timestamp`; keep date rendering in `[changelog].body` (where `timestamp` is available) to avoid `Variable 'timestamp' not found in context while rendering 'header'`.
- In GitHub Actions, avoid `${{ env.* }}` composition inside job-level `env` value definitions in this workflow; use direct `${{ github.* }}` expressions there to prevent workflow-parse errors.

## Tests

```bash
# Backend (5 tests, all must pass):
uv run pytest tests/

# Frontend (TypeScript + Vite build must be clean):
npm run build

# Docs (MkDocs Material):
just docs-build
```

Pytest discovery is intentionally constrained via `backend/pyproject.toml` (`[tool.pytest.ini_options] testpaths = ["tests"]`) so operational scripts in `backend/scripts/` are not collected as tests in CI.

- CI now includes image CVE scanning via Trivy in `.github/workflows/ci.yaml` (`trivy-image-scan` matrix job, `aquasecurity/trivy-action@0.34.2`). It builds local backend/spoke/auth-header-injector images in CI, emits a JSON report artifact (`trivy-report-<image>`), and prints both severity distribution and `HIGH/CRITICAL` summary to logs (report-only, no fail gate). The Trivy step is non-blocking (`continue-on-error`), configured with Docker socket access (`docker-host: unix:///var/run/docker.sock`), and scans include unfixed vulnerabilities (`ignore-unfixed: false`).

Always verify backend, frontend, and docs build before marking work done.

## Helm Chart

- Helm chart at `deploy/helm/rhacs-manager/` is the sole deployment method (kustomize removed).
- Default chart output includes: Namespace, backend secret, hub-spoke-secret, CNPG `Cluster` (`postgresql.cnpg.io/v1`), backend + spoke-style frontend Deployments + Services, oauth-proxy SA/CRB, auth-header-injector RBAC, and two OpenShift Routes.
- Hub install: `helm upgrade --install rhacs-manager deploy/helm/rhacs-manager -n rhacs-manager --create-namespace`
- Spoke install: `helm upgrade --install rhacs-manager-spoke deploy/helm/rhacs-manager -n rhacs-manager --create-namespace --set mode=spoke --set spoke.oauthProxy.cookieSecret=<secret> --set spoke.secret.stringData.HUB_API_URL=<url> --set spoke.secret.stringData.SPOKE_API_KEY=<key> --set spoke.secret.stringData.CLUSTER_NAME=<name>`
- Plain YAML rendering: `just render-hub` / `just render-spoke` (runs `helm template`)
- Prerequisites:
  - CNPG operator installed in cluster
  - `central-db-password` secret present in `rhacs-manager` namespace for StackRox DB access
  - Route hosts and secret values overridden from defaults before production use
- Minimal values override examples in `examples/`:
  - `examples/helm-values-hub-minimal.yaml`
  - `examples/helm-values-spoke-minimal.yaml`
- CI build workflow publishes Helm chart OCI artifacts to GHCR from `.github/workflows/build.yaml` (`build-helm-chart` job).
