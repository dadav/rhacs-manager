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
- **Secret** -- Backend configuration (app DB URL, SMTP, auth)
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

## StackRox Central DB Connection

The backend connects to the StackRox Central DB (`central_active`) via individual env vars set in the deployment manifest. The DB password is sourced from the `central-db-password` secret (key: `password`), which must exist in the `rhacs-manager` namespace.

**Copy the secret from the `stackrox` namespace:**

```bash
kubectl get secret central-db-password -n stackrox -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp)' \
  | kubectl apply -n rhacs-manager -f -
```

The deployment sets these env vars directly (no need to configure them in the secret):

| Env Var | Value | Source |
|---------|-------|--------|
| `STACKROX_DB_HOST` | `central-db.stackrox.svc` | Deployment manifest |
| `STACKROX_DB_PORT` | `5432` | Deployment manifest |
| `STACKROX_DB_USER` | `postgres` | Deployment manifest |
| `STACKROX_DB_NAME` | `central_active` | Deployment manifest |
| `STACKROX_DB_PASSWORD` | *(from secret)* | `central-db-password` secret, key `password` |

## StackRox NetworkPolicy

The `stackrox` namespace has restrictive NetworkPolicies. You must allow ingress from `rhacs-manager` to `central-db` on port 5432:

```bash
kubectl apply -f deploy/hub/stackrox-networkpolicy.yaml
```

Verify the `podSelector` label matches your central-db pods:

```bash
kubectl get pods -n stackrox -l app.kubernetes.io/name=central-db --show-labels
```

If the label differs, update `deploy/hub/stackrox-networkpolicy.yaml` accordingly.

## Configuring the Secret

Edit `deploy/base/secret.yaml` before deploying. Required values:

```yaml
stringData:
  APP_DATABASE_URL: "postgresql+asyncpg://user:password@postgres:5432/rhacs_manager"
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
# 1. Copy central-db-password secret from stackrox namespace
kubectl get secret central-db-password -n stackrox -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp)' \
  | kubectl apply -n rhacs-manager -f -

# 2. Apply the stackrox NetworkPolicy (allows backend → central-db traffic)
kubectl apply -f deploy/hub/stackrox-networkpolicy.yaml

# 3. Deploy the application
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
