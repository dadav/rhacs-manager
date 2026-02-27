set shell := ["bash", "-euxo", "pipefail", "-c"]

app_db_url := "postgresql+asyncpg://postgres@localhost/rhacs_manager"
stackrox_db_url := "postgresql+asyncpg://postgres@localhost/central_active"

test:
  uv --directory backend run pytest

lint:
  npm --prefix frontend run lint

dev session="sec":
  #!/usr/bin/env bash
  set -euo pipefail
  export APP_DB_URL="{{app_db_url}}"
  export STACKROX_DB_URL="{{stackrox_db_url}}"
  export DEV_MODE=true

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

  echo "Starting dev session: {{session}} (DEV_USER_ROLE=${DEV_USER_ROLE})"

  cleanup() {
    jobs -p | xargs -r kill
  }
  trap cleanup EXIT INT TERM

  uv --directory backend run alembic upgrade head
  uv --directory backend run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
  npm --prefix frontend run dev -- --host 0.0.0.0
