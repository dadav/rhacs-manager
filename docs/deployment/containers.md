# Container Images

Three container images are built for deployment. All dependencies are bundled at build time -- no internet access is required at runtime.

## Backend Image

**File**: `backend/Containerfile`

Single-stage build based on `python:3.14-slim`.

```bash
just build-backend-image tag=rhacs-manager-backend:latest

# Or manually:
podman build -t rhacs-manager-backend:latest backend/
```

Build steps:

1. Installs `uv` from the official image
2. Copies `pyproject.toml` and `uv.lock` for layer caching
3. Runs `uv sync --frozen --no-dev` (production deps only)
4. Copies application code and Alembic migrations
5. On startup: runs `alembic upgrade head` then starts uvicorn on port 8000

| Property   | Value                     |
| ---------- | ------------------------- |
| Base image | `python:3.14-slim`        |
| Port       | 8000                      |
| Entrypoint | Alembic migrate + uvicorn |

## Frontend Image

**File**: `frontend/Containerfile`

Two-stage build: Bun build stage + nginx serve stage.

```bash
just build-frontend-image tag=rhacs-manager-frontend:latest

# Or manually:
podman build -t rhacs-manager-frontend:latest frontend/
```

Build steps:

1. **Builder stage** (`oven/bun:1`): `bun install --frozen-lockfile` + `bun run build` (TypeScript + Vite)
2. **Serve stage** (`nginxinc/nginx-unprivileged:alpine`):
   - Installs `gettext` for `envsubst`
   - Copies built SPA
   - Copies `nginx.conf.spoke` as a template (processed at startup)
   - Copies `docker-entrypoint-spoke.sh`

| Property    | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Base image  | `nginxinc/nginx-unprivileged:alpine`                           |
| Port        | 8080                                                           |
| Runtime env | `HUB_API_URL`, `SPOKE_API_KEY` (substituted into nginx config) |
| User        | `101` (nginx unprivileged)                                     |

The same image is used for both hub and spoke deployments. In spoke mode, `envsubst` injects `HUB_API_URL` and `SPOKE_API_KEY` into the nginx config at container startup to proxy `/api/*` requests to the hub backend.

## MCP Server Image

**File**: `mcp-server/Containerfile`

Lightweight standalone image for the optional MCP server sidecar. The MCP server is a pure HTTP proxy to the backend API — it has no database dependencies and only needs `mcp[cli]`, `httpx`, and `pydantic-settings`.

```bash
podman build -t rhacs-manager-mcp-server:latest mcp-server/
```

Build steps:

1. Installs `uv` from the official image
2. Copies `pyproject.toml` and `uv.lock` for layer caching
3. Runs `uv sync --frozen --no-dev` (production deps only)
4. Copies the `mcp_server/` Python package
5. On startup: runs `python -m mcp_server` on port 8001

| Property   | Value              |
| ---------- | ------------------ |
| Base image | `python:3.14-slim` |
| Port       | 8001               |
| Entrypoint | MCP server via uv  |

## Build Summary

| Image    | Build command               | Base                        | Port |
| -------- | --------------------------- | --------------------------- | ---- |
| Backend  | `just build-backend-image`  | `python:3.14-slim`          | 8000 |
| Frontend | `just build-frontend-image` | `nginx-unprivileged:alpine` | 8080 |
| MCP Server | `podman build mcp-server/`  | `python:3.14-slim`        | 8001 |
