# Getting Started

This guide walks you through deploying RHACS CVE Manager on OpenShift.

## Prerequisites

- OpenShift cluster with RHACS (StackRox) installed
- Helm 3
- `oc` CLI authenticated to the target cluster
- Access to a container registry for the RHACS Manager images
- SMTP server for email notifications

## Step 1: Build and Push Container Images

Build the three container images and push them to your registry:

```bash
# Backend
just build-backend-image tag=registry.example.com/rhacs-manager-backend:latest

# Frontend (hub)
just build-frontend-image tag=registry.example.com/rhacs-manager-frontend:latest

# Frontend (spoke, if using spoke clusters)
just build-spoke-image tag=registry.example.com/rhacs-manager-spoke:latest
```

Push the images to your registry:

```bash
podman push registry.example.com/rhacs-manager-backend:latest
podman push registry.example.com/rhacs-manager-frontend:latest
podman push registry.example.com/rhacs-manager-spoke:latest
```

See [Container Images](deployment/containers.md) for details on each image.

## Step 2: Prepare the Hub Cluster

### Copy the StackRox DB Password

The backend needs read-only access to the StackRox central database. Copy the password secret into the `rhacs-manager` namespace:

```bash
oc create namespace rhacs-manager

oc get secret central-db-password -n stackrox -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid, .metadata.creationTimestamp)' \
  | oc apply -n rhacs-manager -f -
```

### Create a Values File

Create a `my-hub-values.yaml` with your environment-specific configuration:

```yaml
backend:
  image:
    repository: registry.example.com/rhacs-manager-backend
    tag: latest
  secret:
    stringData:
      SECRET_KEY: "<random-secret-key>"
      DEV_MODE: "false"
      SMTP_HOST: "smtp.example.com"
      SMTP_PORT: "587"
      SMTP_FROM: "rhacs-manager@example.com"
      SMTP_USER: "user"
      SMTP_PASSWORD: "password"
      SMTP_TLS: "false"
      SMTP_STARTTLS: "true"
      SMTP_VALIDATE_CERTS: "true"
      APP_BASE_URL: "https://rhacs-manager.apps.hub.example.com"
      SPOKE_API_KEYS: "<key-for-spoke-clusters>"
      SEC_TEAM_GROUP: "rhacs-security-team"
      MANAGEMENT_EMAIL: "security@example.com"

frontend:
  image:
    repository: registry.example.com/rhacs-manager-frontend
    tag: latest
```

See `examples/helm-values-hub-minimal.yaml` for a minimal example and [Configuration](configuration.md) for all available settings.

## Step 3: Deploy the Hub

```bash
helm upgrade --install rhacs-manager deploy/helm/rhacs-manager \
  -n rhacs-manager --create-namespace \
  -f my-hub-values.yaml
```

Verify the deployment:

```bash
oc -n rhacs-manager get pods
oc -n rhacs-manager get routes
curl https://rhacs-manager-api.apps.hub.example.com/health
```

Expected health response:

```json
{ "status": "ok" }
```

## Step 4: Deploy Spoke Clusters (Optional)

Spoke clusters provide namespace-scoped access to the hub via OpenShift OAuth. Each spoke runs a frontend pod with an oauth-proxy sidecar -- no backend or database is needed on spoke clusters.

```bash
helm upgrade --install rhacs-manager-spoke deploy/helm/rhacs-manager \
  -n rhacs-manager --create-namespace \
  --set mode=spoke \
  --set spoke.oauthProxy.cookieSecret="$(openssl rand -base64 32)" \
  --set spoke.frontend.image.repository=registry.example.com/rhacs-manager-spoke \
  --set spoke.frontend.image.tag=latest \
  --set spoke.frontend.hubApiUrl=https://rhacs-manager-api.apps.hub.example.com \
  --set spoke.frontend.spokeApiKey="<key-matching-hub-SPOKE_API_KEYS>"
```

See [Spoke Deployment](deployment/spoke.md) for namespace annotation setup and full configuration.

## What's Next?

- [Architecture](architecture.md) -- understand the hub-spoke model
- [Security Model](security.md) -- namespace scoping and role model
- [User Guide](user-guide.md) -- how to use the application
- [Configuration](configuration.md) -- all configuration options
- [Deployment Overview](deployment/index.md) -- detailed deployment reference
