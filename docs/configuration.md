# Configuration

Application configuration is environment-driven via `backend/app/config.py` (Pydantic Settings).

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_DB_URL` | `""` | Optional full app DB URL; overrides component fields |
| `APP_DB_HOST` | `localhost` | App DB host |
| `APP_DB_PORT` | `5432` | App DB port |
| `APP_DB_USER` | `postgres` | App DB user |
| `APP_DB_PASSWORD` | `""` | App DB password |
| `APP_DB_NAME` | `rhacs_manager` | App DB name |
| `STACKROX_DB_URL` | `""` | Optional full StackRox DB URL; overrides component fields |
| `STACKROX_DB_HOST` | `localhost` | StackRox host |
| `STACKROX_DB_PORT` | `5432` | StackRox port |
| `STACKROX_DB_USER` | `postgres` | StackRox user |
| `STACKROX_DB_PASSWORD` | `""` | StackRox password |
| `STACKROX_DB_NAME` | `central_active` | StackRox DB name |

`APP_DB_URL` and `STACKROX_DB_URL` are optional. If either is unset, the backend builds the effective URL from the corresponding split fields.

## Authentication

### Dev Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `DEV_MODE` | `true` | Enable local auth bypass |
| `DEV_USER_ID` | `dev-user-1` | Dev user ID |
| `DEV_USER_NAME` | `Dev User` | Dev **username** (stable identity, used for `@mention` fallback) |
| `DEV_USER_FULL_NAME` | `""` | Optional dev **full name** shown in the UI. Empty falls back to the username |
| `DEV_USER_EMAIL` | `dev@example.com` | Dev email |
| `DEV_USER_ROLE` | `sec_team` | `sec_team` or `team_member` |
| `DEV_USER_NAMESPACES` | `""` | `ns1:cluster1,ns2:cluster2` or `*` for all namespaces |
| `DEV_NAMESPACE_EMAILS` | `""` | `ns1:cluster1=email@company.com,...` mapping for notifications |

### OIDC (Production)

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_ISSUER` | `""` | OIDC issuer URL |
| `OIDC_CLIENT_ID` | `""` | OIDC client ID |

### Spoke Proxy / Group Mapping

| Variable | Default | Description |
|----------|---------|-------------|
| `SPOKE_API_KEYS` | `[]` | JSON list of accepted spoke keys |
| `SEC_TEAM_GROUP` | `rhacs-sec-team` | Group mapped to `sec_team` |
| `CROSS_CLUSTER_ACCESS_SETS` | `[]` | JSON list of cluster sets that share namespace access, e.g. `[["prod","test"]]`. See [Cross-cluster visibility](#cross-cluster-visibility) |
| `NAMESPACE_USER_ANNOTATION` | `rhacs-manager.io/users` | User annotation key read from StackRox for peer clusters. Must match the injector `NAMESPACE_ANNOTATION` |
| `NAMESPACE_GROUP_ANNOTATION` | `rhacs-manager.io/groups` | Group annotation key read from StackRox for peer clusters. Must match the injector `GROUP_ANNOTATION` |

Users can also receive wildcard namespace access from the spoke by setting `X-Forwarded-Namespaces: *`. This keeps the user in the `team_member` role while granting full namespace visibility, so sec-team-only actions stay restricted and CVSS/EPSS thresholds still apply.

### Cross-cluster visibility

By default a user only sees the namespaces annotated for them on the cluster whose spoke frontend they use. With `CROSS_CLUSTER_ACCESS_SETS` the hub backend also grants the namespaces annotated for them on **peer** clusters, so a user annotated on prod and test sees both in either spoke.

```bash
CROSS_CLUSTER_ACCESS_SETS='[["prod","test"]]'
```

- Each inner list is one set of StackRox cluster names (the same values as each spoke's `CLUSTER_NAME`). A cluster in several sets gets the union of their peers. Clusters in no set behave as before.
- Peer annotations (`rhacs-manager.io/users` and `rhacs-manager.io/groups`) are read from StackRox Central's namespace table, which Sensor keeps in sync. Users do not need to visit the peer cluster's spoke first.
- Groups are still resolved on the origin cluster. A group annotation on a peer only matches when a group of the same name exists on the origin cluster and the user is a member (typical for LDAP/IdP-synced groups).
- Each backend process refreshes the annotation index every 5 minutes. If the index is older than 15 minutes (refreshes failing), peers are dropped and users see only their origin cluster until the next successful refresh.
- The hub frontend also uses spoke auth with `CLUSTER_NAME: hub` by default. To include it, set its `CLUSTER_NAME` to the hub's StackRox cluster name and add that name to a set.
- Escalation contact emails (`rhacs-manager.io/escalation-email`) are still collected per spoke.

!!! warning "Only group clusters that trust each other"
    Any admin of a cluster in a set can create users or groups on that cluster and thereby gain the namespaces annotated for those names on every peer. Only put clusters in one set when they share an identity provider and the same admin trust.

### Auth Header Injector (Spoke Sidecar)

The spoke `auth-header-injector` reads Kubernetes namespace annotations and forwards namespace scope/email metadata to the hub backend.

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_NAME` | required | Spoke cluster name appended in forwarded namespace pairs |
| `NAMESPACE_ANNOTATION` | `rhacs-manager.io/users` | Annotation key for comma-separated usernames |
| `GROUP_ANNOTATION` | `rhacs-manager.io/groups` | Annotation key for comma-separated groups |
| `EMAIL_ANNOTATION` | `rhacs-manager.io/escalation-email` | Annotation key for escalation email contact |
| `CACHE_TTL_SECONDS` | `300` | Namespace annotation cache refresh interval. After 3 failed intervals the cache fails closed (no annotation-based namespaces) |
| `GROUP_CACHE_TTL_SECONDS` | `60` | OpenShift user-group cache TTL |
| `KUBE_API_URL` | `https://kubernetes.default.svc` | OpenShift/Kubernetes API base URL |
| `ALL_NAMESPACES_GROUPS` | `""` | Comma-separated OpenShift groups that should receive wildcard `*` namespace access |

## SMTP

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `localhost` | SMTP host |
| `SMTP_PORT` | `25` | SMTP port |
| `SMTP_FROM` | `rhacs-manager@example.com` | Sender |
| `SMTP_USER` | `""` | Username |
| `SMTP_PASSWORD` | `""` | Password |
| `SMTP_TLS` | `false` | Enable implicit TLS/SMTPS (typically port 465) |
| `SMTP_STARTTLS` | `true` | Enable STARTTLS upgrade (typically port 587) |
| `SMTP_VALIDATE_CERTS` | `true` | Validate SMTP TLS certificates |

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_BASE_URL` | `http://localhost:5173` | Base URL used in links and badge URLs |
| `BADGE_BASE_URL` | `""` | Public base URL prepended to badge SVG paths; empty means the API returns relative badge paths |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | App signing key |
| `MANAGEMENT_EMAIL` | `""` | Recipient for weekly digest |
| `DEFAULT_ESCALATION_EMAIL` | `""` | Fallback escalation recipient for namespaces without explicit annotation |
| `TEAM_NOTIFICATION_ACTIVE_DAYS` | `30` | Team notifications (weekly team digest, new relevant CVE alerts) only go to users who signed in within this many days |
| `SCHEDULER_ENABLED` | `true` | Run the background job scheduler in this process. See [Background Scheduler](#background-scheduler). |
| `LOG_LEVEL` | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `LOG_FORMAT` | `text` | `text` prints `LEVEL:logger:message key=value ...`; `json` prints one JSON object per line with `ts`, `level`, `logger`, `msg`, optional `exc`, and structured fields nested under `extra`. The Helm chart sets `json` via `backend.env.logFormat` for the backend and worker. |

## Background Scheduler

`SCHEDULER_ENABLED` toggles the in-process [APScheduler](https://apscheduler.readthedocs.io/) job runner. It is read once at startup:

- `true` — the scheduler starts and an escalation check runs immediately on boot.
- `false` — no background jobs run; the process serves HTTP only and logs `Scheduler disabled (SCHEDULER_ENABLED=false)`.

The scheduled jobs (all times UTC):

| Job | Time | Purpose |
|-----|------|---------|
| `expiry_check` | 01:00 | Mark approved risk acceptances as expired once past their expiry date |
| `weekly_digest` | 07:00 | Send the management digest email (only on the configured `digest_day`) |
| `expiry_warning` | 07:30 | Email risk-acceptance creators 7 days before expiry |
| `escalation_warning` | 07:45 | Email namespace contacts before a CVE escalates (within `escalation_warning_days`) |
| `escalation_check` | 08:00 | Create and clean up escalations and send escalation emails |
| `remediation_overdue_check` | 08:30 | Notify owners of overdue remediations |
| `remediation_auto_resolve` | 09:00 | Auto-resolve remediations when the CVE is no longer reported in the namespace |
| `cve_snapshot` | 02:00 | Store daily per-namespace CVE counts for the dashboard trend |
| `team_cve_alerts` | 02:30 | In-app alerts for CVEs newly above the thresholds or prioritized in a team member's namespaces, plus the opt-in CVE alert summary email (at most one per user per day, counts only). The first run only records a baseline, separately for in-app and email conditions |
| `team_digest` | 07:15 | Weekly opt-in team digest email per user (only on the configured `digest_day`) |

### Deployment: one worker, never the API

The Helm chart runs the backend image as two deployments split by this flag:

- The **API/backend** deployment sets `SCHEDULER_ENABLED=false` and only serves HTTP. It can be scaled to multiple replicas safely.
- The **worker** deployment sets `SCHEDULER_ENABLED=true` and runs the jobs above.

!!! warning "Run the scheduler in exactly one process"
    The scheduler has no distributed locking. If more than one running process has `SCHEDULER_ENABLED=true`, every process fires the jobs independently, producing duplicate escalation emails, digests, and expiry notifications. Keep the worker at a single replica and leave `SCHEDULER_ENABLED=false` everywhere else.

If escalation, digest, expiry, or auto-resolution behavior is missing in a cluster, confirm the **worker** deployment is running, not just the backend. The config default of `true` exists only for the single-process local dev workflow (`just dev`).

## Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `true` | Expose unauthenticated Prometheus metrics at `/metrics` on the API port. See [Monitoring & Metrics](deployment/monitoring.md). |

## Runtime Settings (`/api/settings`)

Security team users manage runtime behavior via API/UI. Values are stored in `global_settings`.

| Setting | Default | Description |
|---------|---------|-------------|
| `min_cvss_score` | `0.0` | Minimum CVSS threshold |
| `min_epss_score` | `0.0` | Minimum EPSS threshold |
| `escalation_rules` | Built-in defaults | Rule set for level escalation |
| `escalation_warning_days` | `3` | Lead time for the upcoming-escalation preview and pre-escalation warning emails |
| `digest_day` | `0` | Weekly digest day (`0` = Monday) |
| `management_email` | `""` | Digest recipient (runtime override) |

### Default Escalation Rules

```json
[
  {
    "severity_min": 3,
    "epss_threshold": 0.0,
    "days_to_level1": 14,
    "days_to_level2": 21,
    "days_to_level3": 30
  },
  {
    "severity_min": 4,
    "epss_threshold": 0.0,
    "days_to_level1": 7,
    "days_to_level2": 14,
    "days_to_level3": 21
  },
  {
    "severity_min": 2,
    "epss_threshold": 0.5,
    "days_to_level1": 14,
    "days_to_level2": 21,
    "days_to_level3": 30
  }
]
```
