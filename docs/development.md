# Development

## Justfile Commands

The project uses [just](https://github.com/casey/just) as a command runner. All commands are defined in the root `justfile`.

| Command | Description |
|---------|-------------|
| `just dev` | Start backend + frontend (sec_team user) |
| `just dev user` | Start backend + frontend (team_member user) |
| `just dev user <ns:cluster> [ns:cluster...]` | Start backend + frontend (team_member user) scoped to one or more namespaces |
| `just dev user '*'` | Start backend + frontend (team_member user) with wildcard all-namespace visibility |
| `just dev-backend` | Start only the backend (sec_team user) |
| `just dev-backend user` | Start only the backend (team_member user) |
| `just dev-backend user <ns:cluster> [ns:cluster...]` | Start only the backend (team_member user) scoped to one or more namespaces |
| `just dev-backend user '*'` | Start only the backend (team_member user) with wildcard all-namespace visibility |
| `just dev-frontend` | Start only the frontend dev server |
| `just test` | Run backend tests (`uv run pytest`) |
| `just lint` | Run frontend linter |
| `just build-frontend` | TypeScript check + Vite build |
| `just check` | Run all checks (test + lint + build-frontend) |
| `just install` | Install all dependencies (backend + frontend) |
| `just migrate` | Run Alembic migrations |
| `just migrate-new "message"` | Create a new Alembic migration |
| `just migrate-status` | Show current migration status |
| `just build-backend-image` | Build backend container image |
| `just build-frontend-image` | Build frontend hub container image |
| `just build-spoke-image` | Build frontend spoke container image |

## Dev Server Sessions

The `just dev` command accepts a session argument that configures the mock user:

| Session | Role | User ID | Name |
|---------|------|---------|------|
| `sec` (default) | `sec_team` | `dev-sec-1` | Dev Security User |
| `user` | `team_member` | `dev-user-1` | Dev Team User |

The backend starts on port 8000 and the frontend on port 5173. Alembic migrations run automatically before the backend starts. Both processes run with hot reload.

For `user` sessions, you can pass one or multiple namespace scopes in `namespace:cluster` format:

```bash
just dev user payments:cluster-a
just dev user payments:cluster-a inventory:cluster-a platform:cluster-b
just dev user '*'
just dev-backend user payments:cluster-a inventory:cluster-a
```

These arguments are translated to `DEV_USER_NAMESPACES` as a comma-separated list, or to `*` for wildcard all-namespace access.

## Code Structure

### Backend

```
backend/app/
  main.py              # FastAPI app, lifespan, router registration
  config.py            # Pydantic Settings (env vars)
  database.py          # Dual engine setup (app_engine + stackrox_engine)
  deps.py              # FastAPI dependency injection (DB sessions)
  auth/
    middleware.py       # Auth: dev mode -> spoke proxy -> OIDC JWT
    group_mapping.py    # Spoke: Keycloak groups -> role (sec_team check)
  routers/             # One module per API domain
    auth.py            # GET /api/auth/me
    cves.py            # CVE listing, detail, comments, deployments
    dashboard.py       # Dashboard + sec dashboard
    risk_acceptances.py # Risk acceptance CRUD + review workflow
    priorities.py      # CVE prioritization (sec team)
    escalations.py     # Escalation listing
    notifications.py   # In-app notifications
    badges.py          # SVG badge management
    settings.py        # Global settings (thresholds, escalation rules)
    audit.py           # Audit log listing
    namespaces.py      # Namespace listing
  models/              # SQLAlchemy ORM models
    user.py            # User, UserRole enum
    risk_acceptance.py # RiskAcceptance, RiskAcceptanceComment, RiskStatus enum
    cve_priority.py    # CvePriority, PriorityLevel enum
    cve_comment.py     # CveComment
    global_settings.py # GlobalSettings (thresholds, escalation rules)
    escalation.py      # Escalation
    notification.py    # Notification
    badge.py           # BadgeToken
    audit_log.py       # AuditLog
  schemas/             # Pydantic request/response models
  stackrox/
    queries.py         # All StackRox DB queries (read-only)
  services/
    audit_service.py   # log_action() helper
  mail/
    service.py         # SMTP email sending
  notifications/
    service.py         # In-app notification creation
  tasks/
    scheduler.py       # APScheduler: escalation check, weekly digest
  badges/
    generator.py       # Pure Python SVG badge generation
```

### Frontend

```
frontend/src/
  main.tsx             # React entry point
  App.tsx              # Router, QueryClient, i18n setup
  api/
    client.ts          # Base fetch wrapper (getErrorMessage for errors)
  pages/               # One component per route
  components/          # Reusable UI components
  utils/
    errors.ts          # getErrorMessage() - handles all error shapes
  i18n/                # German translations (react-i18next)
```

## StackRox Query Pattern

All StackRox queries are centralized in `backend/app/stackrox/queries.py`. Always use the `image_cves_v2` view:

```sql
FROM deployments d
JOIN deployments_containers dc ON dc.deployments_id = d.id
JOIN image_cves_v2 ic ON ic.imageid = dc.image_id
LEFT JOIN image_component_v2 comp ON comp.id = ic.componentid
```

Key fields on `image_cves_v2`:

- `ic.cvebaseinfo_cve` -- CVE ID
- `ic.severity` -- severity level (1-4)
- `ic.cvss` -- CVSS score
- `ic.cvebaseinfo_epss_epssprobability` -- EPSS probability
- `ic.impactscore` -- impact score
- `ic.firstimageoccurrence` -- first seen date
- `ic.cvebaseinfo_publishedon` -- published date
- `ic.isfixable` -- whether a fix is available
- `ic.fixedby` -- fix version

!!! warning "Grouping"
    Always group by `ic.cvebaseinfo_cve` (CVE ID), not by `ic.id`. Grouping by `ic.id` creates duplicate rows per CVE.

## Frontend Error Handling

Always use `getErrorMessage(error)` from `frontend/src/utils/errors.ts` for user-visible errors:

```tsx
import { getErrorMessage } from '../utils/errors';

// Correct
<Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />

// Wrong -- never do this
<Alert variant="danger" title={`Fehler: ${(error as Error).message}`} />
```

The function handles all error shapes: `Error` instances, `{message}`, `{detail: string}`, `{detail: [...]}`, arrays.

## Testing

### Backend Tests

```bash
just test
# or: uv --directory backend run pytest
```

5 tests covering core functionality. All must pass before merging.

### Frontend Verification

```bash
just build-frontend
# or: cd frontend && bun run build
```

TypeScript type checking and Vite build must complete without errors.

## Database Migrations

Create a new migration after modifying models:

```bash
just migrate-new "add widget table"
```

This auto-generates a migration file in `backend/alembic/versions/`. Review the generated migration before applying.

Apply migrations:

```bash
just migrate
```

!!! tip
    Migrations run automatically when starting the dev server with `just dev`.

## Updating Dependencies

Routine dependency updates are handled automatically by [Renovate](https://docs.renovatebot.com/), which opens pull requests on early Mondays. The sections below cover how to update dependencies manually when needed.

### Backend (Python / uv)

Dependencies are declared in `backend/pyproject.toml` and pinned in `backend/uv.lock`.

```bash
# Update all dependencies to their latest allowed versions
uv --directory backend lock --upgrade
uv --directory backend sync

# Update a single package
uv --directory backend lock --upgrade-package fastapi
uv --directory backend sync

# Add a new dependency
uv --directory backend add somepackage

# Add a new dev dependency
uv --directory backend add --group dev somepkg
```

After updating, run `just test` to verify nothing broke.

### Frontend (TypeScript / bun)

Dependencies are declared in `frontend/package.json` and pinned in `frontend/bun.lock`.

```bash
cd frontend

# Update all dependencies to their latest allowed versions
bun update

# Update a single package
bun update @patternfly/react-core

# Add a new dependency
bun add somepackage

# Add a new dev dependency
bun add --dev somepackage
```

After updating, run `just build-frontend` and `just lint` to verify nothing broke.

### Auth Header Injector (Go)

Dependencies are declared in `auth-header-injector/go.mod` and pinned in `auth-header-injector/go.sum`.

```bash
cd auth-header-injector

# Update all dependencies to their latest versions
go get -u ./...
go mod tidy

# Update a single dependency
go get -u k8s.io/client-go
go mod tidy
```

After updating, verify the build with:

```bash
go build -o /dev/null .
```

## PatternFly 6 Notes

When working with the frontend, keep these PatternFly 6 constraints in mind:

- `PageSectionVariants` only has `default` and `secondary` (no `light`)
- `Label` color prop accepts: `blue`, `teal`, `green`, `orange`, `purple`, `red`, `orangered`, `grey`, `yellow` (no `gold`)
- CSS import: `@patternfly/react-core/dist/styles/base.css`
