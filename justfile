set shell := ["bash", "-euxo", "pipefail", "-c"]

app_db_url := "postgresql+asyncpg://postgres@localhost/rhacs_manager"
stackrox_db_url := "postgresql+asyncpg://postgres@localhost/central_active"

# List available recipes
default:
  @just --list

# Run backend tests
test:
  uv --directory backend run pytest

# Run frontend linter
lint:
  npm --prefix frontend run lint

# Type-check and build frontend
build-frontend:
  npm --prefix frontend run build

# Check everything (tests + lint + frontend build)
check:
  just test
  just lint
  just build-frontend

# Run alembic migration (upgrade to head)
migrate:
  APP_DB_URL="{{app_db_url}}" uv --directory backend run alembic upgrade head

# Create a new alembic migration
migrate-new message:
  APP_DB_URL="{{app_db_url}}" uv --directory backend run alembic revision --autogenerate -m "{{message}}"

# Show current alembic migration status
migrate-status:
  APP_DB_URL="{{app_db_url}}" uv --directory backend run alembic current

# Install all dependencies (backend + frontend)
install:
  uv --directory backend sync
  npm --prefix frontend install

# Build backend container image
build-backend-image tag="rhacs-manager-backend:latest":
  podman build -t {{tag}} backend/

# Build frontend hub container image
build-frontend-image tag="rhacs-manager-frontend:latest":
  podman build -t {{tag}} frontend/

# Build frontend spoke container image
build-spoke-image tag="rhacs-manager-spoke:latest":
  podman build -t {{tag}} -f frontend/Containerfile.spoke frontend/

# Start dev server (session: sec or user; optional namespaces for team_member)
dev session="sec" *namespaces:
  #!/usr/bin/env bash
  set -euo pipefail
  export APP_DB_URL="{{app_db_url}}"
  export STACKROX_DB_URL="{{stackrox_db_url}}"
  export DEV_MODE=true
  export DEV_USER_NAMESPACES=""

  namespaces_raw="{{namespaces}}"
  if [[ -n "${namespaces_raw}" ]]; then
    IFS=' ' read -r -a namespace_args <<< "${namespaces_raw}"
    for ns in "${namespace_args[@]}"; do
      if [[ "${ns}" != *:* ]]; then
        echo "Invalid namespace entry '${ns}'. Expected format: namespace:cluster"
        exit 1
      fi
    done
    export DEV_USER_NAMESPACES="${namespaces_raw// /,}"
  fi

  case "{{session}}" in
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
      echo "Invalid session '{{session}}'. Use one of: sec, user"
      exit 1
      ;;
  esac

  echo "Starting dev session: {{session}} (DEV_USER_ROLE=${DEV_USER_ROLE}, DEV_USER_NAMESPACES='${DEV_USER_NAMESPACES}')"

  cleanup() {
    jobs -p | xargs -r kill
  }
  trap cleanup EXIT INT TERM

  uv --directory backend run alembic upgrade head
  uv --directory backend run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
  npm --prefix frontend run dev -- --host 0.0.0.0

# Start only the backend dev server (session: sec or user; optional namespaces for team_member)
dev-backend session="sec" *namespaces:
  #!/usr/bin/env bash
  set -euo pipefail
  export APP_DB_URL="{{app_db_url}}"
  export STACKROX_DB_URL="{{stackrox_db_url}}"
  export DEV_MODE=true
  export DEV_USER_NAMESPACES=""

  namespaces_raw="{{namespaces}}"
  if [[ -n "${namespaces_raw}" ]]; then
    IFS=' ' read -r -a namespace_args <<< "${namespaces_raw}"
    for ns in "${namespace_args[@]}"; do
      if [[ "${ns}" != *:* ]]; then
        echo "Invalid namespace entry '${ns}'. Expected format: namespace:cluster"
        exit 1
      fi
    done
    export DEV_USER_NAMESPACES="${namespaces_raw// /,}"
  fi

  case "{{session}}" in
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
      echo "Invalid session '{{session}}'. Use one of: sec, user"
      exit 1
      ;;
  esac

  echo "Starting backend: {{session}} (DEV_USER_ROLE=${DEV_USER_ROLE}, DEV_USER_NAMESPACES='${DEV_USER_NAMESPACES}')"
  uv --directory backend run alembic upgrade head
  uv --directory backend run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start only the frontend dev server
dev-frontend:
  npm --prefix frontend run dev -- --host 0.0.0.0

# Start Mailhog container (SMTP :1025, Web UI :8025)
mailhog:
  podman run --rm -p 1025:1025 -p 8025:8025 docker.io/mailhog/mailhog

# Send test escalation emails to Mailhog
test-escalation-email:
  APP_DB_URL="{{app_db_url}}" SMTP_HOST=localhost SMTP_PORT=1025 SMTP_TLS=false SMTP_STARTTLS=false SMTP_USER="" SMTP_PASSWORD="" MANAGEMENT_EMAIL="security-team@example.com" uv --directory backend run alembic upgrade head
  APP_DB_URL="{{app_db_url}}" SMTP_HOST=localhost SMTP_PORT=1025 SMTP_TLS=false SMTP_STARTTLS=false SMTP_USER="" SMTP_PASSWORD="" MANAGEMENT_EMAIL="security-team@example.com" uv --directory backend run python scripts/test_escalation_email.py

# Render hub Helm chart to plain YAML
render-hub *args:
  helm template rhacs-manager deploy/helm/rhacs-manager -n rhacs-manager {{args}}

# Render spoke Helm chart to plain YAML
render-spoke *args:
  helm template rhacs-manager-spoke deploy/helm/rhacs-manager -n rhacs-manager --set mode=spoke {{args}}

# Serve docs locally with live reload
docs:
  uv run --with mkdocs-material mkdocs serve

# Build docs to site/ directory
docs-build:
  uv run --with mkdocs-material mkdocs build

# Prepare a release: update Chart.yaml appVersion, commit, and tag (e.g. just release v0.11.0)
release version:
  #!/usr/bin/env bash
  set -euo pipefail
  version="{{version}}"
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

  # Commit and tag
  git add deploy/helm/rhacs-manager/Chart.yaml
  git commit -m "release: ${tag}"
  git tag "${tag}"
  echo "Created commit and tag ${tag}"
