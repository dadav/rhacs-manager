# Container Images

Three container images are built for deployment. All dependencies are bundled at build time -- no internet access is required at runtime.

## Backend Image

**File**: `backend/Containerfile`

Single-stage build based on `python:3.12-slim`.

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
| Base image | `python:3.12-slim`        |
| Port       | 8000                      |
| Entrypoint | Alembic migrate + uvicorn |

## Frontend Spoke Image

**File**: `frontend/Containerfile`

Two-stage build: Bun build stage + nginx serve stage.

Build steps:

1. **Builder stage** (`oven/bun:1`): `bun install --frozen-lockfile` + `bun run build` (TypeScript + Vite)
2. **Serve stage** (`nginxinc/nginx-unprivileged:alpine`): copies built SPA to nginx html directory

| Property    | Value                                             |
| ----------- | ------------------------------------------------- |
| Base image  | `nginxinc/nginx-unprivileged:alpine`              |
| Port        | 8080                                              |
| SPA routing | Custom `nginx.conf` with fallback to `index.html` |

```bash
just build-spoke-image tag=rhacs-manager-spoke:latest

# Or manually:
podman build -t rhacs-manager-spoke:latest -f frontend/Containerfile frontend/
```

Build steps:

1. **Builder stage** (`oven/bun:1`): `bun install --frozen-lockfile` + `bun run build`
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

The spoke image differs from the hub image in that it:

- Uses `envsubst` to inject `HUB_API_URL` and `SPOKE_API_KEY` into the nginx config at container startup
- Proxies all `/api/*` requests to the hub backend with authentication headers
- Forwards oauth-proxy identity headers (`X-Forwarded-User`, `X-Forwarded-Email`, `X-Forwarded-Groups`)

## Build Summary

| Image            | Build command               | Base                        | Port |
| ---------------- | --------------------------- | --------------------------- | ---- |
| Backend          | `just build-backend-image`  | `python:3.12-slim`          | 8000 |
| Frontend (hub)   | `just build-frontend-image` | `nginx-unprivileged:alpine` | 8080 |
| Frontend (spoke) | `just build-spoke-image`    | `nginx-unprivileged:alpine` | 8080 |
