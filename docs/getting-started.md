# Getting Started

## Prerequisites

- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- Bun 1.3+ for frontend package management
- PostgreSQL with:
  - `rhacs_manager` (application DB, read-write)
  - `central_active` (StackRox DB, read-only)
- [just](https://github.com/casey/just) (recommended)

## Install Dependencies

```bash
git clone <repo-url> rhacs-manager
cd rhacs-manager

just install
# or manually:
uv --directory backend sync
cd frontend && bun install
```

## Create App Database

```sql
CREATE DATABASE rhacs_manager;
```

Run migrations:

```bash
just migrate

# or manually:
APP_DB_URL="postgresql+asyncpg://postgres@localhost/rhacs_manager" \
  uv --directory backend run alembic upgrade head
```

## Start Development

`just dev` starts backend (`:8000`) and frontend (`:5173`) with hot reload.

=== "Security Team Session"

    ```bash
    just dev
    # same as: just dev sec
    ```

=== "Team Member Session"

    ```bash
    just dev user
    just dev user payments:cluster-a
    just dev user payments:cluster-a inventory:cluster-a
    just dev user '*'
    ```

In user mode, namespace scopes are translated into `DEV_USER_NAMESPACES`. Use `*` to simulate a non-sec-team user who can see all namespaces.

## Verify Changes

```bash
just check

# individual commands:
just test           # backend tests
just lint           # frontend lint
just build-frontend # frontend type-check + build
```

!!! warning
    Backend tests and frontend build must pass before merging.

## Local Docs Preview

```bash
just docs
# build static output:
just docs-build
```

## Project Layout

```text
rhacs-manager/
  auth-header-injector/
    main.go
    Containerfile
  backend/
    app/
      main.py
      config.py
      database.py
      routers/
      models/
      stackrox/queries.py
      tasks/scheduler.py
    alembic/
    tests/
  frontend/
    src/
      pages/
      components/
      api/client.ts
      utils/errors.ts
  deploy/
    helm/
      rhacs-manager/
  docs/
  mkdocs.yml
  justfile
```
