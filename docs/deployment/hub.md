# Hub Cluster Deployment

The hub cluster runs the complete application: backend API, frontend SPA, and has access to both databases.

## Components

The hub overlay (`deploy/hub/kustomization.yaml`) references the base configuration directly:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
```

This deploys:

- **Backend deployment** -- FastAPI container (port 8000)
- **Backend service** -- ClusterIP service for the backend
- **Frontend deployment** -- nginx container serving the SPA
- **Frontend service** -- ClusterIP service for the frontend
- **Route** -- OpenShift route exposing the frontend
- **Secret** -- Backend configuration (DB URLs, SMTP, auth)
- **Namespace** -- `rhacs-manager`

## Backend Deployment

The backend container runs Alembic migrations on startup, then starts uvicorn:

```dockerfile
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

Resource allocation:

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 100m | 500m |
| Memory | 256Mi | 512Mi |

Health probes:

- **Readiness**: `GET /health` every 10s (initial delay 10s)
- **Liveness**: `GET /health` every 30s (initial delay 30s)

## Configuring the Secret

Edit `deploy/base/secret.yaml` before deploying. Required values:

```yaml
stringData:
  APP_DB_URL: "postgresql+asyncpg://user:password@postgres:5432/rhacs_manager"
  STACKROX_DB_URL: "postgresql+asyncpg://postgres:password@central-db.stackrox.svc:5432/central_active"
  SECRET_KEY: "your-random-secret-key"
  DEV_MODE: "false"
  SMTP_HOST: "smtp.example.com"
  SMTP_PORT: "587"
  SMTP_USER: "your-smtp-user"
  SMTP_PASSWORD: "your-smtp-password"
  SMTP_FROM: "rhacs-manager@example.com"
  APP_BASE_URL: "https://rhacs-manager.apps.hub.example.com"
  SPOKE_API_KEYS: '["generated-spoke-key-1","generated-spoke-key-2"]'
  SEC_TEAM_GROUP: "rhacs-sec-team"
  MANAGEMENT_EMAIL: "security-team@example.com"
```

!!! tip "Generating API keys"
    Use `openssl rand -hex 32` to generate secure API keys for spoke authentication.

## Applying

```bash
kubectl kustomize deploy/hub/ | kubectl apply -f -
```

Verify the deployment:

```bash
kubectl -n rhacs-manager get pods
kubectl -n rhacs-manager get routes
```

Test the health endpoint:

```bash
curl https://rhacs-manager-api.apps.hub.example.com/health
# {"status": "ok"}
```
