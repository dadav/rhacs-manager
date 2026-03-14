# API Endpoints

All endpoints are prefixed with `/api`.

## Auth

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | Any authenticated user | Current user profile |

`GET /api/auth/me` includes `has_all_namespaces` so the frontend can distinguish wildcard visibility from `sec_team`.

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
| `show_suppressed` | bool | `false` | include suppressed (false positive) CVEs |

!!! note
    Prioritized CVEs are always placed first, regardless of selected sort column.

Wildcard all-namespace users can query all namespaces through these endpoints, but non-sec-team CVSS/EPSS thresholds still apply to their results.

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
| DELETE | `/api/risk-acceptances/{id}` | `team_member` | Delete own requested record |
| POST | `/api/risk-acceptances/{id}/comments` | Any | Add comment |
| GET | `/api/risk-acceptances/{id}/comments` | Any | List comments |

### Scope Modes

`scope.mode`: `all`, `namespace`, `image`, `deployment`

Targets are validated against affected deployments for that CVE.

## Suppression Rules (False Positives)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/suppression-rules` | Any | Create a suppression rule (team members: `requested`, sec team: `approved`) |
| GET | `/api/suppression-rules` | Any | List all rules |
| GET | `/api/suppression-rules/{id}` | Any | Get one rule |
| PUT | `/api/suppression-rules/{id}` | Creator or `sec_team` | Update reason/reference |
| PATCH | `/api/suppression-rules/{id}` | `sec_team` | Approve or reject a `requested` rule |
| DELETE | `/api/suppression-rules/{id}` | Creator (`requested` only) or `sec_team` | Delete a rule |

### `POST /api/suppression-rules` Body

```json
{
  "type": "component",
  "component_name": "github.com/grafana/grafana",
  "version_pattern": "v0.0.0-*",
  "reason": "Internal Go module version, not actual Grafana version. See upstream issue.",
  "reference_url": "https://github.com/grafana/grafana/issues/106728"
}
```

Or for a single CVE:

```json
{
  "type": "cve",
  "cve_id": "CVE-2024-12345",
  "reason": "This CVE does not apply to our deployment configuration."
}
```

### `GET /api/suppression-rules` Query Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `status` | string | - | `requested`, `approved`, `rejected` |
| `type` | string | - | `component`, `cve` |

### `PATCH /api/suppression-rules/{id}` Body

```json
{
  "approved": true,
  "comment": "Verified upstream issue confirms version misidentification."
}
```

### Suppression Behavior

- **Component rules** match CVEs whose affected components include a component with the specified `component_name` and, if provided, a version matching the `version_pattern` glob (e.g., `v0.0.0-*`).
- **CVE rules** match a single CVE by ID.
- Only `approved` rules suppress CVEs. Rules in `requested` status mark CVEs with a `suppression_requested` flag but do not hide them.
- Suppressed CVEs are excluded from the default `/api/cves` response. Pass `show_suppressed=true` to include them.
- Active rules are unique per target: one active rule per `(component_name, version_pattern)` for component rules, one per `cve_id` for CVE rules.

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

Wildcard all-namespace users can list escalations across the full fleet, but this does not grant sec-team review privileges elsewhere in the API.

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
| GET | `/api/badges` | Any | List own badge tokens, or all badge tokens for users who can see all namespaces |
| POST | `/api/badges` | `team_member` | Create badge token |
| DELETE | `/api/badges/{id}` | Creator or `sec_team` | Delete a badge token |
| GET | `/api/badges/{token}/status.svg` | Public | Render SVG status badge |

Badge behavior:

- For ordinary team members, a badge without an explicit namespace stores the user's current namespace list as its fixed scope.
- For wildcard all-namespace users, a badge without an explicit namespace represents all namespaces dynamically.
- Badge SVG responses are cached server-side for 5 minutes and return `Cache-Control: max-age=300`.

## Remediations

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/remediations` | Any user with namespace access | Create a remediation for a CVE in one namespace |
| GET | `/api/remediations` | Any | List accessible remediations |
| GET | `/api/remediations/stats` | Any | Status counters for the current scope |
| GET | `/api/remediations/{id}` | Any | Get one remediation |
| PATCH | `/api/remediations/{id}` | Any user with access | Update status, assignee, target date, or notes |
| DELETE | `/api/remediations/{id}` | Creator or `sec_team` | Delete an `open` or `wont_fix` remediation |

### `POST /api/remediations` Body

```json
{
  "cve_id": "CVE-2025-1234",
  "namespace": "payments",
  "cluster_name": "cluster-a",
  "assigned_to": "alice",
  "target_date": "2026-03-31",
  "notes": "Upgrade the affected base image."
}
```

Behavior:

- The caller must have access to the namespace unless they can already see all namespaces.
- The backend verifies that the CVE currently exists in that namespace.
- Only one remediation may exist per `(cve_id, namespace, cluster_name)`.
- New records always start in status `open`.

### `GET /api/remediations` Query Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `status` | string | - | `open`, `in_progress`, `resolved`, `verified`, `wont_fix` |
| `cve_id` | string | - | Exact CVE ID |
| `cluster` | string | - | Scope filter |
| `namespace` | string | - | Scope filter |
| `assigned_to` | string | - | Exact assignee match |
| `overdue` | bool | - | Post-filter for `target_date < today` and status `open` or `in_progress` |

### `GET /api/remediations/stats`

Returns:

```json
{
  "open": 0,
  "in_progress": 0,
  "resolved": 0,
  "verified": 0,
  "wont_fix": 0,
  "overdue": 0
}
```

### `PATCH /api/remediations/{id}` Body

```json
{
  "status": "in_progress",
  "assigned_to": "alice",
  "target_date": "2026-03-31",
  "notes": "Work started",
  "wont_fix_reason": null
}
```

Status transitions:

- `open` -> `in_progress`, `wont_fix`
- `in_progress` -> `resolved`, `wont_fix`, `open`
- `resolved` -> `verified`, `in_progress`
- `verified` -> `in_progress`
- `wont_fix` -> `open`

Special rules:

- Only `sec_team` can set `verified`.
- `wont_fix` requires `wont_fix_reason`; the backend stores that text in `notes`.
- Moving back to `open` or `in_progress` clears prior resolution or verification timestamps when reopening from `resolved`, `verified`, or `wont_fix`.

## Exports

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/exports/pdf` | Any | Export the current filtered CVE list as PDF |
| GET | `/api/exports/excel` | Any | Export the current filtered CVE list as Excel |
| POST | `/api/exports/excel/import` | Non-`sec_team` users with namespaces | Preview or create batch risk acceptances from an uploaded Excel file |

### `GET /api/exports/pdf`

Accepts the same list filters as `/api/cves`:

- `search`
- `severity`
- `fixable`
- `prioritized_only`
- `sort_by`
- `sort_desc`
- `cvss_min`
- `epss_min`
- `component`
- `risk_status`
- `cluster`
- `namespace`

Response:

- Content type: `application/pdf`
- Attachment filename: `cve-bericht-YYYY-MM-DD.pdf`
- Includes the filtered CVEs plus enriched deployment and component details

### `GET /api/exports/excel`

Accepts the same query parameters as the PDF export.

Response:

- Content type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Attachment filename: `cve-export-YYYY-MM-DD.xlsx`
- Emits one row per CVE, not one row per deployment

### `POST /api/exports/excel/import`

Query parameters:

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `confirm` | bool | `false` | `false` = preview only, `true` = create records |

Request:

- Multipart upload with one Excel file field named `file`
- Maximum upload size: 10 MB

Behavior:

- `sec_team` cannot use this route.
- The caller must have at least one namespace.
- Rows are grouped by `(cve_id, justification)`.
- For each valid group, the backend derives a namespace scope covering all affected namespaces currently visible to the caller for that CVE.
- The backend validates the resulting scope against live affected deployments.

Preview response (`confirm=false`):

```json
{
  "items": [
    {
      "cve_id": "CVE-2025-1234",
      "justification": "Temporary exception while vendor fix is in progress...",
      "justification_full": "Temporary exception while vendor fix is in progress...",
      "scope": "namespace (2 Namespace(s))",
      "expires_at": "2026-06-01T00:00:00",
      "valid": true,
      "errors": [],
      "row_count": 2
    }
  ],
  "total_valid": 1,
  "total_invalid": 0
}
```

Confirm response (`confirm=true`):

```json
{
  "created": [
    {
      "cve_id": "CVE-2025-1234",
      "ra_id": "3f6e6350-0000-0000-0000-000000000000"
    }
  ],
  "failed": []
}
```

## Settings

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/settings/thresholds` | Any | Read the current CVSS and EPSS visibility thresholds |
| GET | `/api/settings` | `sec_team` | Get global settings |
| PATCH | `/api/settings` | `sec_team` | Update settings |
| GET | `/api/settings/threshold-preview` | `sec_team` | Threshold impact preview |
| POST | `/api/settings/send-digest` | `sec_team` | Send the weekly digest immediately |

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

Wildcard all-namespace users receive the full namespace list from this endpoint.

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
