# Hub Cluster Deployment

The hub cluster runs backend + frontend and stores application state.

## What the Hub Deploys

- Backend (`rhacs-manager-backend`) on port 8000
- Frontend (`rhacs-manager-frontend`) on port 8080
- Two routes:
  - `rhacs-manager` (frontend)
  - `rhacs-manager-api` (backend API)
- Backend secret (`rhacs-manager-backend-secret`)
- CNPG PostgreSQL cluster (app DB)

## Required Configuration

The backend expects these core values in `backend.secret.stringData`:

- `APP_DB_URL` or split vars (`APP_DB_HOST`, `APP_DB_USER`, `APP_DB_PASSWORD`, `APP_DB_NAME`)
- `SECRET_KEY`
- `DEV_MODE` (must be `false` in production)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`, `SMTP_STARTTLS`, `SMTP_VALIDATE_CERTS`
- `APP_BASE_URL`
- `SPOKE_API_KEYS`
- `SEC_TEAM_GROUP`
- `MANAGEMENT_EMAIL`

See `examples/helm-values-hub-minimal.yaml` for a minimal values override.

## StackRox DB Password Secret

Copy `central-db-password` from `stackrox` to `rhacs-manager`:

```bash
kubectl get secret central-db-password -n stackrox -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp)' \
  | kubectl apply -n rhacs-manager -f -
```

## Deploy

```bash
helm upgrade --install rhacs-manager deploy/helm/rhacs-manager \
  -n rhacs-manager --create-namespace \
  -f my-hub-values.yaml
```

Or render plain YAML:

```bash
just render-hub -f my-hub-values.yaml | kubectl apply -f -
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
