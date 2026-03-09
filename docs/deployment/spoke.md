# Spoke Cluster Deployment

Spoke clusters run authenticated frontend access and proxy API traffic to the hub backend.

## Pod Composition

The spoke frontend deployment contains three containers:

1. `oauth-proxy` (`:8443`) for OpenShift OAuth login
2. `auth-header-injector` (`:8081`) to resolve namespace access into forwarded scope headers
3. `frontend` (`:8080`) nginx SPA with `/api/*` proxy to hub

## Auth Header Injector Behavior

- Reads `X-Forwarded-User`
- Resolves namespace permissions from Kubernetes namespace annotations:
  - `rhacs-manager.io/users` (comma-separated usernames)
  - `rhacs-manager.io/groups` (comma-separated group names)
  - `rhacs-manager.io/escalation-email` (single escalation contact email for the namespace)
- Writes `X-Forwarded-Namespaces` as `namespace:cluster` pairs or `*` for wildcard access
- Writes `X-Forwarded-Namespace-Emails` as `namespace:cluster=email@company.com` pairs
- Writes `X-Forwarded-Groups` from the resolved OpenShift user groups
- If the user belongs to a configured `ALL_NAMESPACES_GROUPS` group, the injector emits `X-Forwarded-Namespaces: *` instead of enumerating namespaces

Configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_NAME` | required | Name of this spoke cluster |
| `NAMESPACE_ANNOTATION` | `rhacs-manager.io/users` | User annotation key |
| `GROUP_ANNOTATION` | `rhacs-manager.io/groups` | Group annotation key |
| `EMAIL_ANNOTATION` | `rhacs-manager.io/escalation-email` | Namespace escalation contact annotation key |
| `CACHE_TTL_SECONDS` | `300` | Cache refresh interval |
| `GROUP_CACHE_TTL_SECONDS` | `60` | Group lookup cache interval |
| `ALL_NAMESPACES_GROUPS` | `""` | Comma-separated groups that should receive wildcard namespace access |

`*` namespace access is for users who need fleet-wide visibility without receiving backend `sec_team` privileges. The hub interprets this as full namespace scope, not as an administrative role change.

Example namespace metadata:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  annotations:
    rhacs-manager.io/users: "alice,bob"
    rhacs-manager.io/groups: "payments-oncall,platform-sec"
    rhacs-manager.io/escalation-email: "payments-escalation@example.com"
```

## Spoke Secret

Set these values via Helm (or in a values file under `spoke.secret.stringData`):

| Key | Description |
|-----|-------------|
| `HUB_API_URL` | Hub backend API URL (e.g. `https://rhacs-manager-api.apps.hub.example.com`) |
| `SPOKE_API_KEY` | Must match one entry in hub's `SPOKE_API_KEYS` |
| `CLUSTER_NAME` | Name of this spoke cluster |

## OAuth Proxy Cookie Secret

Generate a random value for `spoke.oauthProxy.cookieSecret`:

```bash
openssl rand -base64 32
```

## Build and Push Images

```bash
just build-spoke-image tag=registry.example.com/rhacs-manager-spoke:latest
podman build -t registry.example.com/rhacs-manager-auth-header-injector:latest auth-header-injector/
podman push registry.example.com/rhacs-manager-spoke:latest
podman push registry.example.com/rhacs-manager-auth-header-injector:latest
```

## Deploy

```bash
helm upgrade --install rhacs-manager-spoke deploy/helm/rhacs-manager \
  -n rhacs-manager --create-namespace \
  --set mode=spoke \
  -f my-spoke-values.yaml
```

Or render plain YAML:

```bash
just render-spoke -f my-spoke-values.yaml | kubectl apply -f -
```

See `examples/helm-values-spoke-minimal.yaml` for a minimal values override.
