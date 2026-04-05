set shell := ["bash", "-euxo", "pipefail", "-c"]

app_db_url := "postgresql+asyncpg://postgres@localhost/rhacs_manager"
stackrox_db_url := "postgresql+asyncpg://postgres@localhost/central_active"

# List available recipes
default:
    @just --list

# Run backend tests
test:
    uv --directory backend run pytest

# Run mcpserver tests
test-mcpserver:
    uv --directory mcp-server run pytest

# Run frontend tests
test-frontend:
    cd frontend && bun run test

# Run frontend and backend linters
lint:
    cd frontend && bun run lint
    uv --directory backend run ruff check .

# Run backend linter only
lint-backend:
    uv --directory backend run ruff check .

# Format backend code
format-backend:
    uv --directory backend run ruff format .

# Type-check and build frontend
build-frontend:
    cd frontend && bun run build

# Check everything (tests + lint + frontend build + docs)
check:
    just test
    just test-frontend
    just lint
    just build-frontend
    just docs-build

# Run alembic migration (upgrade to head)
migrate:
    APP_DB_URL="{{ app_db_url }}" uv --directory backend run alembic upgrade head

# Create a new alembic migration
migrate-new message:
    APP_DB_URL="{{ app_db_url }}" uv --directory backend run alembic revision --autogenerate -m "{{ message }}"

# Show current alembic migration status
migrate-status:
    APP_DB_URL="{{ app_db_url }}" uv --directory backend run alembic current

# Install all dependencies (backend + frontend)
install:
    uv --directory backend sync
    uv --directory mcp-server sync
    cd frontend && bun install

# Update all dependencies to latest versions
update-deps:
    uv lock --upgrade --directory backend
    uv lock --upgrade --directory mcp-server
    cd frontend && bun update
    cd auth-header-injector && go get -u ./... && go mod tidy
    cd random-data-generator && go get -u ./... && go mod tidy

# Build backend container image
build-backend-image tag="rhacs-manager-backend:latest":
    podman build -t {{ tag }} backend/

# Build frontend container image
build-frontend-image tag="rhacs-manager-frontend:latest":
    podman build -t {{ tag }} frontend/

# Start dev server (session: sec or user; optional namespaces for team_member)
dev session="sec" *namespaces:
    #!/usr/bin/env bash
    set -euo pipefail
    export APP_DB_URL="{{ app_db_url }}"
    export STACKROX_DB_URL="{{ stackrox_db_url }}"
    export DEV_MODE=true
    export DEV_USER_NAMESPACES=""

    namespaces_raw="{{ namespaces }}"
    if [[ "${namespaces_raw}" == "*" ]]; then
      export DEV_USER_NAMESPACES="*"
    elif [[ -n "${namespaces_raw}" ]]; then
      IFS=' ' read -r -a namespace_args <<< "${namespaces_raw}"
      for ns in "${namespace_args[@]}"; do
        if [[ "${ns}" != *:* ]]; then
          echo "Invalid namespace entry '${ns}'. Expected format: namespace:cluster or *"
          exit 1
        fi
      done
      export DEV_USER_NAMESPACES="${namespaces_raw// /,}"
    fi

    case "{{ session }}" in
      sec|sec_team)
        export DEV_USER_ROLE="sec_team"
        export DEV_USER_ID="dev-sec-1"
        export DEV_USER_NAME="Dev Security User"
        export DEV_USER_EMAIL="dev-sec@example.com"
        ;;
      user|normal|team_member)
        export DEV_USER_ROLE="team_member"
        export DEV_USER_ID="dev-user-1"
        export DEV_USER_NAME="Dev Team User"
        export DEV_USER_EMAIL="dev-user@example.com"
        ;;
      *)
        echo "Invalid session '{{ session }}'. Use one of: sec, user"
        exit 1
        ;;
    esac

    echo "Starting dev session: {{ session }} (DEV_USER_ROLE=${DEV_USER_ROLE}, DEV_USER_NAMESPACES='${DEV_USER_NAMESPACES}')"

    cleanup() {
      jobs -p | xargs -r kill
    }
    trap cleanup EXIT INT TERM

    uv --directory backend run alembic upgrade head
    uv --directory backend run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    cd frontend && bun run dev --host 0.0.0.0

# Start only the backend dev server (session: sec or user; optional namespaces for team_member)
dev-backend session="sec" *namespaces:
    #!/usr/bin/env bash
    set -euo pipefail
    export APP_DB_URL="{{ app_db_url }}"
    export STACKROX_DB_URL="{{ stackrox_db_url }}"
    export DEV_MODE=true
    export DEV_USER_NAMESPACES=""

    namespaces_raw="{{ namespaces }}"
    if [[ "${namespaces_raw}" == "*" ]]; then
      export DEV_USER_NAMESPACES="*"
    elif [[ -n "${namespaces_raw}" ]]; then
      IFS=' ' read -r -a namespace_args <<< "${namespaces_raw}"
      for ns in "${namespace_args[@]}"; do
        if [[ "${ns}" != *:* ]]; then
          echo "Invalid namespace entry '${ns}'. Expected format: namespace:cluster or *"
          exit 1
        fi
      done
      export DEV_USER_NAMESPACES="${namespaces_raw// /,}"
    fi

    case "{{ session }}" in
      sec|sec_team)
        export DEV_USER_ROLE="sec_team"
        export DEV_USER_ID="dev-sec-1"
        export DEV_USER_NAME="Dev Security User"
        export DEV_USER_EMAIL="dev-sec@example.com"
        ;;
      user|normal|team_member)
        export DEV_USER_ROLE="team_member"
        export DEV_USER_ID="dev-user-1"
        export DEV_USER_NAME="Dev Team User"
        export DEV_USER_EMAIL="dev-user@example.com"
        ;;
      *)
        echo "Invalid session '{{ session }}'. Use one of: sec, user"
        exit 1
        ;;
    esac

    echo "Starting backend: {{ session }} (DEV_USER_ROLE=${DEV_USER_ROLE}, DEV_USER_NAMESPACES='${DEV_USER_NAMESPACES}')"
    uv --directory backend run alembic upgrade head
    uv --directory backend run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start MCP server (optional, connects to backend API)
dev-mcp *args:
    MCP_BACKEND_URL="http://localhost:8000" uv --directory mcp-server run python -m mcp_server {{ args }}

# Start MCP server in readonly mode
dev-mcp-readonly:
    MCP_BACKEND_URL="http://localhost:8000" MCP_READONLY=true uv --directory mcp-server run python -m mcp_server

# Start only the frontend dev server
dev-frontend:
    cd frontend && bun run dev --host 0.0.0.0

# Start Mailhog container (SMTP :1025, Web UI :8025)
mailhog:
    podman run --rm -p 1025:1025 -p 8025:8025 docker.io/mailhog/mailhog

# Send test escalation emails to Mailhog
test-escalation-email:
    APP_DB_URL="{{ app_db_url }}" SMTP_HOST=localhost SMTP_PORT=1025 SMTP_TLS=false SMTP_STARTTLS=false SMTP_USER="" SMTP_PASSWORD="" MANAGEMENT_EMAIL="security-team@example.com" uv --directory backend run alembic upgrade head
    APP_DB_URL="{{ app_db_url }}" SMTP_HOST=localhost SMTP_PORT=1025 SMTP_TLS=false SMTP_STARTTLS=false SMTP_USER="" SMTP_PASSWORD="" MANAGEMENT_EMAIL="security-team@example.com" uv --directory backend run python scripts/test_escalation_email.py

# Render hub Helm chart to plain YAML
render-hub *args:
    helm template rhacs-manager deploy/helm/rhacs-manager -n rhacs-manager {{ args }}

# Render spoke Helm chart to plain YAML
render-spoke *args:
    helm template rhacs-manager-spoke deploy/helm/rhacs-manager -n rhacs-manager --set mode=spoke {{ args }}

# Serve docs locally with live reload
docs:
    uv run --with mkdocs-material mkdocs serve

# Build docs to site/ directory
docs-build:
    uv run --with mkdocs-material mkdocs build --strict

# Deploy to local CRC cluster (installs CNPG operator, stand-in StackRox DB, and rhacs-manager)
deploy:
    #!/usr/bin/env bash
    set -euo pipefail

    # Skip CNPG operator install if a running operator is already present
    if oc get deployment -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg &>/dev/null \
       && [ "$(oc get deployment -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg -o name 2>/dev/null)" != "" ]; then
      echo "==> CNPG operator already present, skipping install"
    else
      echo "==> Adding CNPG Helm repo"
      helm repo add cnpg https://cloudnative-pg.github.io/charts
      helm repo update cnpg

      echo "==> Installing CNPG CRDs (server-side apply to avoid managedFields conflicts)"
      helm template cnpg-operator cnpg/cloudnative-pg \
        --namespace cnpg-system \
        --include-crds | oc apply --server-side --force-conflicts -f - 2>/dev/null || true

      echo "==> Installing CNPG operator (OpenShift-compatible)"
      helm upgrade --install cnpg-operator cnpg/cloudnative-pg \
        --namespace cnpg-system --create-namespace \
        --skip-crds \
        --set containerSecurityContext.runAsUser=null \
        --set containerSecurityContext.runAsGroup=null \
        --set containerSecurityContext.seccompProfile=null \
        --set podSecurityContext.seccompProfile=null \
        --wait --timeout 5m
    fi

    echo "==> Waiting for CNPG CRD to be established"
    oc wait --for=condition=Established crd/clusters.postgresql.cnpg.io --timeout=60s

    echo "==> Waiting for CNPG operator to be ready"
    oc rollout status deployment/cnpg-operator-cloudnative-pg -n cnpg-system --timeout=120s

    echo "==> Ensuring Immediate-binding StorageClass for CNPG"
    oc apply -f deploy/storageclass-immediate.yaml

    echo "==> Ensuring rhacs-manager namespace"
    oc create namespace rhacs-manager --dry-run=client -o yaml | oc apply -f -

    echo "==> Creating stand-in StackRox central-db (with retry for API discovery)"
    for attempt in $(seq 1 6); do
      oc delete cluster central-db -n rhacs-manager --ignore-not-found &>/dev/null
      oc delete pvc -l cnpg.io/cluster=central-db -n rhacs-manager --ignore-not-found &>/dev/null
      oc delete secret -l cnpg.io/cluster=central-db -n rhacs-manager --ignore-not-found &>/dev/null
      oc apply -f deploy/central-db-cluster.yaml -n rhacs-manager
      sleep 10
      if oc get pods -n rhacs-manager -l cnpg.io/cluster=central-db --no-headers 2>/dev/null | grep -q .; then
        echo "    central-db pod detected"
        break
      fi
      echo "    Attempt ${attempt}/6: waiting for API discovery cache refresh..."
      sleep 20
    done

    echo "==> Waiting for central-db to become ready (up to 5m)"
    oc wait --for=condition=Ready cluster/central-db -n rhacs-manager --timeout=300s

    echo "==> Syncing central-db superuser password"
    central_pw="$(oc get secret central-db-superuser -n rhacs-manager -o jsonpath='{.data.password}' | base64 -d)"
    oc exec central-db-1 -n rhacs-manager -c postgres -- \
      psql -U postgres -c "ALTER USER postgres PASSWORD '${central_pw}'"

    echo "==> Generating oauth-proxy cookie secret"
    cookie_secret="$(openssl rand -base64 24)"

    echo "==> Installing rhacs-manager"
    helm upgrade --install rhacs-manager deploy/helm/rhacs-manager \
      -n rhacs-manager \
      -f deploy/local-values.yaml \
      --set "frontend.oauthProxy.cookieSecret=${cookie_secret}" \
      --wait

    frontend_host="$(oc get route rhacs-manager -n rhacs-manager -o jsonpath='{.spec.host}' 2>/dev/null || echo 'unknown')"
    echo "==> Done! Frontend: https://${frontend_host}"

# Remove rhacs-manager, stand-in DB, and CNPG operator from local cluster
undeploy:
    #!/usr/bin/env bash
    set -euo pipefail

    echo "==> Uninstalling rhacs-manager"
    helm uninstall rhacs-manager -n rhacs-manager --ignore-not-found || true

    echo "==> Deleting stand-in central-db"
    oc delete -f deploy/central-db-cluster.yaml -n rhacs-manager --ignore-not-found || true

    echo "==> Deleting leftover PVCs"
    oc delete pvc -l cnpg.io/cluster=central-db -n rhacs-manager --ignore-not-found || true
    oc delete pvc -l cnpg.io/cluster=rhacs-manager-db -n rhacs-manager --ignore-not-found || true

    echo "==> Uninstalling CNPG operator (if Helm-managed)"
    helm uninstall cnpg-operator -n cnpg-system --ignore-not-found 2>/dev/null || true

    echo "==> Deleting Immediate StorageClass"
    oc delete -f deploy/storageclass-immediate.yaml --ignore-not-found || true

    echo "==> Done"

# Show deployment status for rhacs-manager on local cluster
deploy-status:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "==> CNPG Clusters"
    oc get clusters.postgresql.cnpg.io -n rhacs-manager 2>/dev/null || echo "  (none)"
    echo ""
    echo "==> Pods"
    oc get pods -n rhacs-manager 2>/dev/null || echo "  (none)"
    echo ""
    echo "==> Routes"
    oc get routes -n rhacs-manager 2>/dev/null || echo "  (none)"

# Port-forward central-db for local access (run in background)
port-forward-central-db:
    oc port-forward -n rhacs-manager svc/central-db-rw 5433:5432

# Generate random StackRox data from cluster deployments (requires port-forward)
generate-data *args:
    #!/usr/bin/env bash
    set -euo pipefail
    central_pw="$(oc get secret central-db-superuser -n rhacs-manager -o jsonpath='{.data.password}' | base64 -d)"
    cd random-data-generator && go run main.go \
      --db-url "postgresql://postgres:${central_pw}@localhost:5433/central_active?sslmode=disable" \
      {{ args }}

# Prepare a release: update Chart.yaml appVersion, commit, and tag (e.g. just release v0.11.0)
release version:
    #!/usr/bin/env bash
    set -euo pipefail
    version="{{ version }}"
    # Strip leading 'v' for appVersion
    app_version="${version#v}"
    # Ensure version starts with 'v' for the tag
    tag="v${app_version}"

    # Validate semver format
    if ! [[ "${app_version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Error: '${version}' is not a valid semver version (expected: v1.2.3 or 1.2.3)"
      exit 1
    fi

    # Check for clean working tree
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "Error: working tree is not clean. Commit or stash changes first."
      exit 1
    fi

    # Check tag doesn't already exist
    if git rev-parse "${tag}" >/dev/null 2>&1; then
      echo "Error: tag '${tag}' already exists."
      exit 1
    fi

    # Update appVersion in Chart.yaml
    sed -i "s/^appVersion: .*/appVersion: \"${app_version}\"/" deploy/helm/rhacs-manager/Chart.yaml
    echo "Updated Chart.yaml appVersion to ${app_version}"

    # Update version in frontend/package.json
    sed -i "s/\"version\": \".*\"/\"version\": \"${app_version}\"/" frontend/package.json
    echo "Updated frontend/package.json version to ${app_version}"

    # Commit and tag
    git add deploy/helm/rhacs-manager/Chart.yaml frontend/package.json
    git commit -m "release: ${tag}"
    git tag "${tag}"
    echo "Created commit and tag ${tag}"
