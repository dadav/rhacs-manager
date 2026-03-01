# Spoke Cluster Deployment

Spoke clusters run only the frontend with an oauth-proxy sidecar. All API requests are proxied to the hub backend. Users authenticate via OpenShift OAuth (backed by Keycloak) and never need direct hub access.

## Architecture

```mermaid
sequenceDiagram
    participant User
    participant Route as OpenShift Route<br/>(TLS)
    participant OAuth as oauth-proxy<br/>(:8443)
    participant Nginx as Spoke nginx<br/>(:8080)
    participant Hub as Hub Backend

    User->>Route: HTTPS request
    Route->>OAuth: TLS termination
    OAuth->>OAuth: OpenShift OAuth
    OAuth->>Nginx: Request + X-Forwarded-*
    Nginx->>Nginx: Serve SPA (/)
    Nginx->>Hub: Proxy /api/* with X-Api-Key
    Hub-->>Nginx: API response
    Nginx-->>OAuth: Response
    OAuth-->>Route: Response
    Route-->>User: HTTPS response
```

## Components

The spoke overlay (`deploy/spoke/kustomization.yaml`) deploys:

```yaml
resources:
  - namespace.yaml
  - spoke-secret.yaml
  - frontend-deployment.yaml
  - frontend-service.yaml
  - oauth-proxy.yaml
  - route.yaml
```

### Frontend Deployment

The spoke frontend deployment runs two containers in a single pod:

**1. oauth-proxy sidecar** (`quay.io/openshift/origin-oauth-proxy:4.14`):

- Listens on port 8443 (HTTPS)
- Uses OpenShift OAuth provider
- Passes user identity headers to the upstream
- Requires a TLS secret and ServiceAccount with OAuth redirect

**2. Spoke frontend** (`rhacs-manager-frontend-spoke:latest`):

- Listens on port 8080 (HTTP)
- Serves the React SPA
- Proxies `/api/*` requests to the hub backend
- Injects `X-Api-Key` and forwards `X-Forwarded-*` headers

### OAuth Proxy Setup

The `oauth-proxy.yaml` creates:

- **ServiceAccount** `rhacs-manager-oauth-proxy` with OAuth redirect annotation pointing to the route
- **ClusterRoleBinding** granting `system:auth-delegator` for token validation

!!! note "TLS certificate"
    The oauth-proxy expects a TLS secret named `rhacs-manager-oauth-proxy-tls`. On OpenShift, this is typically auto-provisioned by the service-ca operator when using a service-serving certificate annotation.

### Nginx Configuration

The spoke nginx config (`frontend/nginx.conf.spoke`) handles:

1. **SPA routing** -- all unknown paths fall back to `index.html`
2. **API proxying** -- `/api/*` requests are proxied to `${HUB_API_URL}` with:
    - `X-Api-Key: ${SPOKE_API_KEY}` for hub authentication
    - Forwarded identity headers from oauth-proxy (`X-Forwarded-User`, `X-Forwarded-Email`, `X-Forwarded-Groups`)
3. **Static asset caching** -- JS, CSS, images cached for 1 year with immutable directive
4. **Gzip compression** enabled for text content types

Variables `HUB_API_URL` and `SPOKE_API_KEY` are substituted at container startup via `envsubst`.

## Configuring the Spoke Secret

Edit `deploy/spoke/spoke-secret.yaml`:

```yaml
stringData:
  HUB_API_URL: "https://rhacs-manager-api.apps.hub.example.com"
  SPOKE_API_KEY: "must-match-one-of-hub-SPOKE_API_KEYS"
```

!!! warning
    The `SPOKE_API_KEY` must exactly match one of the keys in the hub's `SPOKE_API_KEYS` list. API key validation uses constant-time comparison.

## Group-to-Team Mapping

When a spoke user authenticates, their Keycloak groups (received via `X-Forwarded-Groups`) are mapped to teams:

1. If the user belongs to the group specified by `SEC_TEAM_GROUP` (default: `rhacs-sec-team`), they get the `sec_team` role
2. The first group matching an entry in `GROUP_TEAM_MAPPING` determines the team assignment
3. The team name from the mapping must exist in the app database

Example hub configuration:

```bash
SEC_TEAM_GROUP="rhacs-sec-team"
GROUP_TEAM_MAPPING='{"platform-team":"Platform","app-team":"Application Development"}'
```

## Applying

```bash
# Build the spoke frontend image
just build-spoke-image tag=registry.example.com/rhacs-manager-spoke:latest

# Push to registry
podman push registry.example.com/rhacs-manager-spoke:latest

# Update image reference in deploy/spoke/frontend-deployment.yaml
# Apply manifests
kubectl kustomize deploy/spoke/ | kubectl apply -f -
```

## Cookie Secret

Generate a random cookie secret for oauth-proxy:

```bash
openssl rand -base64 32
```

Replace `GENERATE_A_RANDOM_32_BYTE_BASE64` in `deploy/spoke/frontend-deployment.yaml`.
