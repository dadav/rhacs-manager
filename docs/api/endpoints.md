# API Endpoints

All endpoints are prefixed with `/api`.

## Auth

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | Any authenticated user | Current user profile |

## CVEs

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/cves` | Any | List CVEs (paginated/filterable) |
| GET | `/api/cves/{cve_id}` | Any | CVE detail with deployments/components |
| GET | `/api/cves/{cve_id}/comments` | Any | List CVE comments |
| POST | `/api/cves/{cve_id}/comments` | Any | Add CVE comment |
| GET | `/api/cves/{cve_id}/deployments` | Any | Affected deployments |

### `/api/cves` Query Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `page` | int | `1` | 1-indexed |
| `page_size` | int | `50` | `1..200` |
| `search` | string | - | CVE ID substring |
| `severity` | int | - | `0..4` |
| `fixable` | bool | - | fix available |
| `prioritized_only` | bool | `false` | only manual priorities |
| `sort_by` | string | `severity` | `severity`, `cvss`, `epss_probability`, `affected_deployments`, `first_seen`, `published_on` |
| `sort_desc` | bool | `true` | descending when true |
| `cvss_min` | float | - | `0..10` |
| `epss_min` | float | - | `0..1` |
| `component` | string | - | component name filter |
| `risk_status` | string | - | `any`, `requested`, `approved` |
| `cluster` | string | - | scope filter |
| `namespace` | string | - | scope filter |

!!! note
    Prioritized CVEs are always placed first, regardless of selected sort column.

## Dashboard

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Any | Dashboard dataset (scoped for non-sec users) |

Response includes stat cards and chart data:

- `stat_total_cves`, `stat_escalations`, `stat_upcoming_escalations`
- `stat_fixable_critical_cves`, `stat_open_risk_acceptances`
- `severity_distribution`, `cves_per_namespace`, `cve_trend`
- `priority_cves`, `high_epss_cves`
- `epss_matrix`, `cluster_heatmap`, `aging_distribution`
- `risk_acceptance_pipeline`

## Risk Acceptances

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/risk-acceptances` | `team_member` | Create request |
| GET | `/api/risk-acceptances` | Any | List accessible records |
| GET | `/api/risk-acceptances/{id}` | Any | Get one record |
| PUT | `/api/risk-acceptances/{id}` | `team_member` | Resubmit approved/rejected request |
| PATCH | `/api/risk-acceptances/{id}` | `sec_team` | Approve/reject requested record |
| DELETE | `/api/risk-acceptances/{id}` | `team_member` | Delete own requested/rejected record |
| POST | `/api/risk-acceptances/{id}/comments` | Any | Add comment |
| GET | `/api/risk-acceptances/{id}/comments` | Any | List comments |

### Scope Modes

`scope.mode`: `all`, `namespace`, `image`, `deployment`

Targets are validated against affected deployments for that CVE.

## Priorities

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/priorities` | Any | List manual priorities |
| POST | `/api/priorities` | `sec_team` | Create priority |
| PATCH | `/api/priorities/{id}` | `sec_team` | Update priority |
| DELETE | `/api/priorities/{id}` | `sec_team` | Delete priority |

## Escalations

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/escalations` | Any | Triggered escalations |
| GET | `/api/escalations/upcoming` | Any | Upcoming escalations from current rules |

Both endpoints accept optional `cluster` and `namespace` filters.

## Notifications

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Any | Latest notifications |
| GET | `/api/notifications/unread-count` | Any | Unread count |
| PATCH | `/api/notifications/{id}/read` | Any | Mark single notification read |
| POST | `/api/notifications/read-all` | Any | Mark all read (204) |

## Badges

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/badges` | Any | List own badge tokens |
| POST | `/api/badges` | `team_member` | Create badge token |
| DELETE | `/api/badges/{id}` | Any | Delete own badge token |
| GET | `/api/badges/{token}/status.svg` | Public | Render SVG status badge |

## Settings

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | `sec_team` | Get global settings |
| PATCH | `/api/settings` | `sec_team` | Update settings |
| GET | `/api/settings/threshold-preview` | `sec_team` | Threshold impact preview |

### `PATCH /api/settings` Body

```json
{
  "min_cvss_score": 0,
  "min_epss_score": 0,
  "escalation_rules": [
    {
      "severity_min": 4,
      "epss_threshold": 0,
      "days_to_level1": 7,
      "days_to_level2": 14,
      "days_to_level3": 21
    }
  ],
  "escalation_warning_days": 3,
  "digest_day": 0,
  "management_email": "security-team@example.com"
}
```

## Namespaces

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/namespaces` | Any | Accessible namespaces |

## Audit

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/audit-log` | `sec_team` | Paginated audit entries |

## Dev-only Endpoints

These routes are available only when `DEV_MODE=true`.

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/dev/trigger-escalation-check` | Any dev user | Trigger escalation check job |
| POST | `/api/dev/trigger-weekly-digest` | Any dev user | Trigger digest job |
