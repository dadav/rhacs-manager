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
| `mcp-server/` | Lightweight MCP server sidecar for AI assistant integration |
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
- `ic.severity` and `ic.cvss` are vendor/scanner values (Red Hat classification and Red Hat CVSS for Red Hat content), not NVD data. NVD's score lives in `ic.nvdcvss` and is not used by the app. Never describe severity or the displayed CVSS as NVD-based.
- `image_cves_v2` has no `operatingsystem` column (dropped in ACS 4.11). OS lives on `image_component_v2.operatingsystem`.

#### The ACS 4.11 dual image model

Since the 4.11 upgrade, image-keyed rows exist in one of two shapes, never both:

- **v2 model**: `image_cves_v2.imageidv2` / `image_component_v2.imageidv2` -> `images_v2.id` (a UUID), reached from `deployments_containers.image_idv2`.
- **legacy model**: `image_cves_v2.imageid` = sha256 digest, reached from `deployments_containers.image_id`.

**All new scan data goes only to the v2 model.** Legacy rows and the whole `images` table are frozen at the upgrade instant. Joining `ic.imageid = dc.image_id` (the pre-4.11 pattern) reads only that frozen side: it surfaces CVEs that no longer exist and misses everything found since the upgrade.

Correct pattern — build on `CVE_ROWS_CTE` from `backend/app/stackrox/queries/_common.py`, which prefers v2 rows and falls back to legacy rows only for images with no v2 scan data. Alias it as `ic` so `VISIBILITY_HAVING` and existing `ic.*` references keep working:

```sql
WITH cve_rows AS (...)   -- CVE_ROWS_CTE
FROM deployments d
JOIN cve_rows ic ON ic.deployments_id = d.id
LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
```

The CTE carries `deployments_id`, `image_id`, and `image_name_fullname`, so queries take those from `ic` rather than joining `deployments_containers` themselves. It excludes the bytea `serialized` column; the protobuf queries in `core.py` read that straight from `image_cves_v2`.

Other 4.11 rules:

- `images_v2.scanstats_componentcount > 0` is the canonical probe for "this image has v2 scan data".
- `images_v2.digest` is **not unique** (same digest, different pull specs). Any lookup by digest must pick one row: `ORDER BY (scanstats_componentcount > 0) DESC, lastupdated DESC LIMIT 1`.
- `image_detail.py` queries `images_v2` first and falls back to `images`; `images_v2_layers` mirrors `images_layers`.
- Unused-but-present 4.11 features (currently empty in our cluster): `base_images*` (base-image awareness), `virtual_machine_*`, `image_component_v2.layertype`, `deployments_containers.type`.

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
- Dashboard payload includes both `priority_cves` and `high_epss_cves`, plus `fix_first_cves` (ranked actionable list) and `cve_history` (real per-day totals).
- `stat_open_risk_acceptances` is scoped: sec team sees the global `requested` count; regular users only count RAs they can access (`user_can_access_ra`), so the stat matches the `/risk-acceptances?status=requested` list.
- The `cve_history` trend is sourced from the `cve_snapshots` table, filled by the daily `cve_snapshot` scheduler job (runs in the single `worker` process only). The `'*'`/`'*'` rows are org-wide counts deduplicated across namespaces; per-namespace rows may count a CVE once per namespace. `count_visible` applies CVSS/EPSS thresholds (always-show CVEs bypass), `count_total` does not.
- `mttr_by_severity` is a sec-team-only audit metric; the endpoint returns an empty list for non-sec-team users.

### CVE detail and workflow rules

- CVE payloads expose both `first_seen` and `published_on`.
- The detail timeline includes a dedicated `Veroeffentlicht` step sourced from `published_on`.
- CVE detail includes Red Hat and NVD links for each CVE ID.
- `contact_emails` in CVE detail should be deduplicated and include `DEFAULT_ESCALATION_EMAIL` as fallback when the user can see all namespaces.

### Comment mention rules

- CVE, escalation-contact, and risk-acceptance comments resolve `@[username]` mentions case-insensitively via `notify_mentions` in `backend/app/notifications/service.py`.
- `notify_mentions` excludes the author, unknown usernames, and duplicates; it returns a `MentionResult` (`recipient_ids` + immutable `MentionEmailJob`s). It creates in-app notification rows inside the caller's comment transaction and must not commit.
- More than `MAX_MENTION_RECIPIENTS` (20) distinct non-self recipients in a single comment raises `ApiError(400, "too_many_mentions")` (checked against the full current message, not the edit delta).
- On edits, pass `previous_message`; only mentions absent from the previous text are notified. Case-only or unrelated edits notify nobody; remove-then-re-add notifies again.
- Mention emails are best-effort and mandatory (no opt-out). The comment endpoint commits first, then schedules **one** FastAPI `BackgroundTasks` job (`mail_svc.send_mention_emails`) that isolates per-recipient SMTP failures. Jobs carry only primitives, never the session or ORM objects.
- Addresses are validated with `email-validator` (syntax only, no DNS). Invalid/placeholder addresses get the in-app notification only, with a structured warning.
- The `mention.html` template contains author, workflow context, and the anchored `APP_BASE_URL` link, but **never the comment text** (recipient namespace access is unverifiable at send time).
- Risk-acceptance overlap: when a sec-team comment mentions the RA creator, pass the mentioned IDs as `exclude_user_ids` to `notify_risk_comment` and suppress the creator's `send_risk_comment_email`, so the creator is not notified twice.
- Usernames are globally unique regardless of case, enforced by the `uq_users_username_lower` unique index on `lower(username)` (migration `021`). Auth sync (`_assert_username_available` in `auth/middleware.py`) raises `ApiError(409, "username_conflict")` on collision; the migration aborts if pre-existing duplicates exist.
- Transactional email links use canonical frontend routes under `APP_BASE_URL`: `/risk-acceptances/...` and `/escalations` (not the old German `/risikoakzeptanzen`/`/eskalationen`).

### Risk acceptance rules

- Risk acceptance creation is CVE-contextual only.
- Single-namespace scopes (mode `namespace`/`image`/`deployment` resolving to one `(cluster, namespace)`) auto-approve on create/update; `mode=all` or scopes spanning multiple namespaces require sec-team review. See `is_single_team_scope` in `backend/app/services/risk_acceptance_service.py`. Auto-approval is recorded with a `risk_acceptance_auto_approved` audit action.
- `/risk-acceptances` is a list and review surface, not a standalone create form.
- `risk_acceptances.scope` uses:
  - `mode`: `all | namespace | image | deployment`
  - `targets`: `{ cluster_name, namespace, image_name?, deployment_id? }[]`
- Scope targets must be validated against real affected deployments for that CVE in the user's visible namespaces.
- Active acceptances are unique by `(cve_id, scope_key)` where `scope_key` is a deterministic hash of normalized scope.
- Excel import groups rows by `(cve_id, justification)`, previews by default, and creates records only with `confirm=true`.

### Remediation rules

- Remediations are namespace-scoped and unique on `(cve_id, namespace, cluster_name)`.
- Status values: `open | in_progress | resolved | wont_fix` (`verified` retained for legacy records only).
- Expected path is `open -> in_progress -> resolved`. `resolved` is terminal (reopen to `in_progress` only).
- Remediations are single-team daily ops; the owning team self-resolves and the sec team audits (no verification gate). Sec-team remediation notifications were removed; they consume the audit log and weekly digest instead.
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

- User-visible API errors must use `ApiError(status, "code")` from `backend/app/i18n.py`, never `HTTPException` with a hardcoded German string. Add the `code` with `de` + `en` text to the `MESSAGES` catalog in `app/i18n.py`. `LanguageMiddleware` resolves the language from the request `Accept-Language` header (sent by `frontend/src/api/client.ts`), defaulting to German. `exports.py` keeps its own `lang`-query bilingual catalog.
- Keep StackRox SQL centralized in `backend/app/stackrox/queries.py`.
- Keep routers thin; move multi-step business rules into `backend/app/services/` when the logic is not purely request mapping.
- Scheduler startup and initial escalation check happen in the FastAPI lifespan.
- Dev-only routes are registered only when `DEV_MODE=true`.
- Alembic should resolve DB config through `app.config.settings.effective_app_db_url`, not a separate hardcoded fallback.
- The mcp-server sidecar must stay stateless (`stateless_http=True` in `mcp-server/mcp_server/server.py`): frontend pods run multiple replicas behind a Service without session affinity, so in-memory MCP sessions break when requests switch pods.

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
- The scheduler (APScheduler cron jobs in `backend/app/tasks/scheduler.py`) must run in exactly one process. The single-replica `worker` deployment is the sole scheduler: it forces `SCHEDULER_ENABLED=true` in its own `env:` block. The multi-replica `backend` deployment must keep an explicit `SCHEDULER_ENABLED=false` in its own `env:` block (overrides the shared backend Secret via `envFrom`). There is no leader election, so any backend replica running the scheduler causes duplicate cron emails. Do not raise `worker.replicaCount` above 1, and do not rely on the Secret value alone to keep the backend's scheduler off.

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
