# Getting Started

## Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 22+** with npm
- **PostgreSQL** -- two databases required:
    - `rhacs_manager` -- application database (read-write)
    - `central_active` -- StackRox Central database (read-only, provided by RHACS)
- **[just](https://github.com/casey/just)** -- command runner (optional but recommended)

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url> rhacs-manager
cd rhacs-manager

# Install all dependencies (backend + frontend)
just install

# Or manually:
uv --directory backend sync
npm --prefix frontend install
```

## Database Setup

Create the application database in PostgreSQL:

```sql
CREATE DATABASE rhacs_manager;
```

The StackRox Central database (`central_active`) is provided by your RHACS installation. You need read-only access to it.

Run Alembic migrations to set up the app DB schema:

```bash
just migrate

# Or manually:
APP_DB_URL="postgresql+asyncpg://postgres@localhost/rhacs_manager" \
  uv --directory backend run alembic upgrade head
```

## Running the Dev Server

The `just dev` command starts both backend (port 8000) and frontend (port 5173) with hot reload. It automatically runs Alembic migrations before starting.

=== "Security Team User (default)"

    ```bash
    just dev
    # or explicitly:
    just dev sec
    ```

    Runs as `DEV_USER_ROLE=sec_team` with full access to all features.

=== "Normal Team Member"

    ```bash
    just dev user
    ```

    Runs as `DEV_USER_ROLE=team_member` with team-scoped access.

The frontend dev server proxies `/api` requests to the backend at `http://localhost:8000`.

!!! note "Dev mode"
    When `DEV_MODE=true`, authentication is bypassed entirely. The dev user is synced to the database from `DEV_USER_*` environment variables on each request. See [Configuration](configuration.md) for all dev mode settings.

## Running Tests

```bash
# Run all checks (backend tests + frontend lint + frontend build)
just check

# Individual commands:
just test           # Backend: uv run pytest tests/
just lint           # Frontend: npm run lint
just build-frontend # Frontend: npm run build (type-check + Vite build)
```

!!! warning
    All 5 backend tests must pass, and the frontend build must complete without errors before submitting changes.

## Project Structure

```
rhacs-manager/
  backend/
    app/
      main.py              # FastAPI app + lifespan
      config.py             # Pydantic Settings (env-driven)
      database.py           # Dual SQLAlchemy engine setup
      auth/
        middleware.py        # Three-mode auth (dev/spoke-proxy/OIDC)
        group_mapping.py     # Spoke proxy group-to-team mapping
      routers/               # API route modules
      models/                # SQLAlchemy ORM models
      stackrox/queries.py    # Read-only StackRox SQL queries
      tasks/scheduler.py     # APScheduler background jobs
      badges/generator.py    # SVG badge generator
    alembic/                 # DB migrations
    tests/                   # Backend tests
  frontend/
    src/
      pages/                 # One file per route
      components/            # Reusable UI components
      api/client.ts          # API fetch wrapper
      utils/errors.ts        # Error message extraction
      i18n/                  # German translations
  deploy/
    base/                    # Kustomize base manifests
    hub/                     # Hub overlay
    spoke/                   # Spoke overlay
  justfile                   # Dev workflow commands
  mkdocs.yml                 # This documentation site
```
