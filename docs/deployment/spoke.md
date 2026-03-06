# Spoke Cluster Deployment

Spoke clusters run authenticated frontend access and proxy API traffic to the hub backend.

## Pod Composition

The spoke frontend deployment contains three containers:

1. `oauth-proxy` (`:8443`) for OpenShift OAuth login
2. `namespace-resolver` (`:8081`) to resolve namespace access into forwarded scope headers
3. `frontend` (`:8080`) nginx SPA with `/api/*` proxy to hub

## Namespace Resolver Behavior

- Reads `X-Forwarded-User`
- Resolves namespace permissions from Kubernetes namespace annotations:
  - `rhacs-manager.io/users` (comma-separated usernames)
  - `rhacs-manager.io/groups` (comma-separated group names)
  - `rhacs-manager.io/escalation-email` (single escalation contact email for the namespace)
- Writes `X-Forwarded-Namespaces` as `namespace:cluster` pairs
- Writes `X-Forwarded-Namespace-Emails` as `namespace:cluster=email@company.com` pairs
- Writes `X-Forwarded-Groups` from the resolved OpenShift user groups

Configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_NAME` | required | Name of this spoke cluster |
| `NAMESPACE_ANNOTATION` | `rhacs-manager.io/users` | User annotation key |
| `GROUP_ANNOTATION` | `rhacs-manager.io/groups` | Group annotation key |
| `EMAIL_ANNOTATION` | `rhacs-manager.io/escalation-email` | Namespace escalation contact annotation key |
| `CACHE_TTL_SECONDS` | `300` | Cache refresh interval |
| `GROUP_CACHE_TTL_SECONDS` | `60` | Group lookup cache interval |

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

Set `deploy/spoke/spoke-secret.yaml`:

```yaml
stringData:
  HUB_API_URL: "https://rhacs-manager-api.apps.hub.example.com"
  SPOKE_API_KEY: "must-match-hub-SPOKE_API_KEYS"
  CLUSTER_NAME: "spoke-cluster-1"
```

## OAuth Proxy Cookie Secret

Generate a random value and replace `GENERATE_A_RANDOM_32_BYTE_BASE64` in `deploy/spoke/frontend-deployment.yaml`:

```bash
openssl rand -base64 32
```

## Build and Push Images

```bash
just build-spoke-image tag=registry.example.com/rhacs-manager-spoke:latest
podman build -t registry.example.com/rhacs-manager-namespace-resolver:latest namespace-resolver/
podman push registry.example.com/rhacs-manager-spoke:latest
podman push registry.example.com/rhacs-manager-namespace-resolver:latest
```

Update image references in `deploy/spoke/frontend-deployment.yaml`, then apply:

```bash
kubectl kustomize deploy/spoke/ | kubectl apply -f -
```
