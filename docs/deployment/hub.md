# Hub Cluster Deployment

The hub cluster runs backend + frontend and stores application state.

## What the Hub Deploys

- Backend (`rhacs-manager-backend`) on port 8000
- Frontend (`rhacs-manager-frontend`) on port 8080
- Two routes:
  - `rhacs-manager` (frontend)
  - `rhacs-manager-api` (backend API)
- Backend secret (`rhacs-manager-backend-secret`)

## Required Secrets and Environment

The backend expects these core keys:

- `APP_DB_URL`
- `SECRET_KEY`
- `DEV_MODE` (must be `false` in production)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`
- `APP_BASE_URL`
- `SPOKE_API_KEYS`
- `SEC_TEAM_GROUP`
- `MANAGEMENT_EMAIL`

`STACKROX_DB_*` values are set directly in `deploy/base/backend-deployment.yaml`, with `STACKROX_DB_PASSWORD` sourced from `central-db-password`.

## StackRox DB Password Secret

Copy `central-db-password` from `stackrox` to `rhacs-manager`:

```bash
kubectl get secret central-db-password -n stackrox -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp)' \
  | kubectl apply -n rhacs-manager -f -
```

## Network Policy (StackRox Namespace)

Allow hub backend access to `central-db:5432`:

```bash
kubectl apply -f deploy/hub/stackrox-networkpolicy.yaml
```

## Deploy

```bash
kubectl kustomize deploy/hub/ | kubectl apply -f -
```

## Verify

```bash
kubectl -n rhacs-manager get pods
kubectl -n rhacs-manager get routes
curl https://rhacs-manager-api.apps.hub.example.com/health
```

Expected health response:

```json
{"status": "ok"}
```
