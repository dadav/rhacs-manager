# API Endpoints

All endpoints are prefixed with `/api`.

## Auth

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | Any authenticated user | Current user profile |
| GET | `/api/auth/users/search` | Any authenticated user | Type-ahead user search for mention/assignee pickers |

`GET /api/auth/me` includes `has_all_namespaces` so the frontend can distinguish wildcard visibility from `sec_team`. It also returns `full_name` (nullable, from the identity provider) and `display_name` (the trimmed `full_name`, falling back to `username`).

`GET /api/auth/users/search?q=...` matches both `full_name` and `username` case-insensitively and ranks full-name prefix matches first, then username prefixes, then other matches. Each result carries `id`, `username`, `full_name`, and `display_name`; pickers show the `display_name` as the primary label and `@username` as a secondary disambiguator.

### Identity and comment content

Every attribution field in the API keeps the stable `username` and adds/uses a `display_name` (the current `full_name`, or `username` when unset). Comment responses expose both the legacy `message` (`@[username]` text) and an enriched, ordered `content` array whose mention segments carry `user_id`, `username`, and the current `display_name`.

Comment create/update requests accept **exactly one** representation:

- Legacy: `{ "message": "hi @[alice]" }`, with usernames resolved case-insensitively.
- Structured: `{ "content": [ { "type": "text", "text": "hi " }, { "type": "mention", "user_id": "..." } ] }`, with mentions resolved by stable `user_id`; an unknown id is rejected.

## CVEs

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/cves` | Any | List CVEs (paginated/filterable) |
| GET | `/api/cves/{cve_id}` | Any | CVE detail with deployments/components. When the CVE no longer affects the visible scope but the caller can see a remediation for it, returns CVE-level facts only with `no_longer_affected=true` (otherwise 404) |
| GET | `/api/cves/{cve_id}/comments` | Any | List CVE comments |
| POST | `/api/cves/{cve_id}/comments` | Any | Add CVE comment |
| GET | `/api/cves/{cve_id}/deployments` | Any | Affected deployments |
| GET | `/api/cves/{cve_id}/subscription` | Any | Whether the caller follows the CVE (`{cve_id, subscribed}`) |
| PUT | `/api/cves/{cve_id}/subscription` | Any | Follow the CVE (idempotent); 404 unless it affects a deployment the caller can see; 400 `too_many_subscriptions` above 500 |
| DELETE | `/api/cves/{cve_id}/subscription` | Any | Stop following (idempotent, always allowed) |
| GET | `/api/me/cve-subscriptions` | Any | The caller's subscriptions (`[{cve_id, created_at}]`, newest first) |

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
| `ignore_thresholds` | bool | `false` | drop the global CVSS/EPSS floor for this request (view only, see below) |
| `subscribed_only` | bool | `false` | only CVEs the caller subscribed to; thresholds still apply. Also accepted by `/api/cves/fixes` and both exports |

!!! note
    Prioritized CVEs are always placed first, regardless of selected sort column.

Wildcard all-namespace users can query all namespaces through these endpoints, but non-sec-team CVSS/EPSS thresholds still apply to their results unless the request sets `ignore_thresholds=true`.

### `ignore_thresholds`

Any user may pass `ignore_thresholds=true` to see CVEs below the global `min_cvss_score` / `min_epss_score`. It removes only the threshold floor: namespace visibility, suppression, and the `cvss_min` / `epss_min` filters still apply. It has no effect for `sec_team` (no floor applies). Background jobs (notifications, digest, escalations, snapshots) and badges always use the global thresholds.

Accepted by `GET /api/cves`, `/api/cves/fixes`, `/api/cves/by-image`, `/api/cves/by-image/{image_id}/cves`, `/api/images/{image_id}`, `/api/dashboard`, `/api/exports/pdf`, and `/api/exports/excel`.

## Dashboard

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Any | Dashboard dataset (scoped for non-sec users) |

Query parameters: `cluster`, `namespace`, `ignore_thresholds` (see [`ignore_thresholds`](#ignore_thresholds)). With `ignore_thresholds=true`, `cve_history` uses the unfiltered per-day totals.

Response includes stat cards and chart data:

- `stat_total_cves`, `stat_escalations` (current highest-level cases, matching `/api/escalations/active/search`), `stat_upcoming_escalations`
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
| PUT | `/api/suppression-rules/{id}` | Creator (`requested` only) or `sec_team` | Update reason/reference and, for CVE rules, scope |
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

Or for a single CVE (no `scope` = global, same as `{"mode": "all", "targets": []}`):

```json
{
  "type": "cve",
  "cve_id": "CVE-2024-12345",
  "reason": "This CVE does not apply to our deployment configuration."
}
```

A CVE rule limited to specific namespaces:

```json
{
  "type": "cve",
  "cve_id": "CVE-2024-12345",
  "reason": "The vulnerable code path is disabled in this namespace.",
  "scope": {
    "mode": "namespace",
    "targets": [{ "cluster_name": "cluster-a", "namespace": "payments" }]
  }
}
```

`scope.mode` is `all` (no targets) or `namespace` (at least one target). Targets must be namespaces where the CVE affects a deployment the caller can see. Component rules reject `scope`.

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
- **CVE rules** match a single CVE by ID, globally or only in their `namespace` targets. In `/api/cves` a CVE counts as suppressed only when a global rule matches or scoped rules cover every `(cluster, namespace)` where the caller sees it.
- Only `approved` rules suppress CVEs. Rules in `requested` status mark CVEs with a `suppression_requested` flag but do not hide them.
- Suppressed CVEs are excluded from the default `/api/cves` response. Pass `show_suppressed=true` to include them.
- Active rules are unique per target: one active rule per `(component_name, version_pattern)` for component rules, one per `cve_id` and normalized scope for CVE rules.
- Escalations, escalation warnings, and team CVE alerts skip each `(cluster, namespace)` that an approved rule covers.

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
| GET | `/api/escalations` | Any | Triggered escalations (full history, array) |
| GET | `/api/escalations/upcoming` | Any | Upcoming escalations from current rules (array) |
| GET | `/api/escalations/active/search` | Any | Paginated active-escalation workspace (current highest level per case) |
| GET | `/api/escalations/upcoming/search` | Any | Paginated upcoming escalations with filters |
| POST | `/api/escalations/{escalation_id}/comments` | `sec_team` | Record contact: add a CVE comment linked to the escalation |

`GET /api/escalations` and `GET /api/escalations/upcoming` are unchanged and still
return plain arrays (kept for MCP compatibility). All four GET endpoints accept
optional `cluster` and `namespace` filters.

### `GET /api/escalations/active/search`

Returns one row per **current** case: the highest escalation level per
`(cve_id, cluster_name, namespace)`, ties broken by newest trigger. A row is
`contacted` once at least one CVE comment is linked to that highest-level
escalation; a newly triggered higher level starts back at "needs action".

Query params: `page` (default 1), `page_size` (default 20, max 100), `search`
(CVE substring), `level` (1-3), `email_status` (`notified` | `pending`),
`contact_status` (`needs_action` | `contacted`), `cluster`, `namespace`.

Response:

```json
{
  "items": [{ "id": "...", "cve_id": "CVE-...", "namespace": "...", "cluster_name": "...",
              "level": 2, "triggered_at": "...", "notified": true, "contacted": false }],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "contact_counts": { "needs_action": 1, "contacted": 0 }
}
```

`contact_counts` is computed after every filter except `contact_status`, so the
UI can show how many rows are hidden by the current contact filter.
For non-security-team callers, `contact_status` is ignored, each item's
`contacted` field is `null`, and `contact_counts` is `null` so the internal
security workflow is not exposed.

### `GET /api/escalations/upcoming/search`

Query params: `page`, `page_size`, `search`, `next_level` (1-3), `severity`
(0-4), `days_max` (only cases escalating within N days), `cluster`, `namespace`.
Returns `{ items, total, page, page_size }`.

### `POST /api/escalations/{escalation_id}/comments`

Sec-team only. Body is the standard comment body (`{ "message": "..." }` or the
structured `{ "content": [...] }` form). Creates
a normal CVE comment linked to the escalation, preserves `@mention`
notifications, and writes a text-free audit entry (`escalation_comment_created`).
The target must still be the current highest-level row for its CVE, cluster, and
namespace; otherwise the endpoint returns `409`.
Deleting the comment writes `escalation_comment_deleted` and returns the row to
"needs action" once the last linked comment is gone. The escalation context
(cluster, namespace, level) is returned on comment responses to sec-team users
only.

Wildcard all-namespace users can list escalations across the full fleet, but this does not grant sec-team review privileges elsewhere in the API.

## Comments

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/comments/mine` | Any | Threads the current user commented in, newest activity first |

### `GET /api/comments/mine`

Query parameters: `kind` (`cve` \| `risk_acceptance` \| `escalation`),
`only_with_replies` (bool), `page` (default 1), `page_size` (default 25, max 200).
Returns `PaginatedResponse[MyCommentThread]`, one item per thread (all comments
on one CVE, or on one risk acceptance).

- Latest own comment and latest reply are each taken from a single row ordered
  by `(created_at DESC, id DESC)`. `replies_since` counts other users' comments
  after the user's latest own comment.
- `kind` is `escalation` only for sec-team users whose latest own comment in the
  thread is escalation-scoped; `escalation_context` is sec-team only.
- `thread_available`: the thread is readable through the existing comment
  endpoints (always true for CVEs, whose comments are global per CVE;
  `user_can_access_ra` for risk acceptances).
- `detail_available` / `detail_link`: the detail page will load. For CVEs this
  means the CVE still affects a deployment in the user's namespaces, or the user
  can see a remediation for it (the rule `GET /api/cves/{cve_id}` applies).
- Risk acceptances the user can no longer access return `replies_since=0` and
  no `last_reply_*` fields.

## Notifications

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Any | Latest notifications |
| GET | `/api/notifications/unread-count` | Any | Unread count |
| PATCH | `/api/notifications/{id}/read` | Any | Mark single notification read |
| POST | `/api/notifications/read-all` | Any | Mark all read (204) |
| DELETE | `/api/notifications/{id}` | Any | Permanently delete a single own notification (204, idempotent) |
| DELETE | `/api/notifications` | Any | Permanently delete all own notifications, including those older than the newest 50 (204, idempotent) |

### Notification preferences

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/me/notification-preferences` | Any | Effective in-app and email setting per category, plus `team_notifications_active` |
| PUT | `/api/me/notification-preferences` | Any | Update one or more categories (`{"items": [{"category", "in_app", "email"}]}`); unknown categories return 400 |

A channel value of `null` means that channel does not exist for the category. `cve_subscription` covers subscription notifications (in-app on by default); its email channel is the daily subscription summary (off by default). Email-only opt-in categories: `team_digest` (weekly digest) and `alert_email_critical` (CVE alert summary email: newly critical and newly fixable critical CVEs). The email channel of `priority` and `new_critical_cve` adds two more conditions to that summary (one shared email per user per day at most). The email channel of `remediation`, `suppression`, and `escalation`, plus the email-only `risk_acceptance_updates`, feed the daily notification summary email (off by default, one per user per day at most).

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
| POST | `/api/remediations/batch` | Any user with namespace access | Create remediations for a CVE in several namespaces at once |
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

### `POST /api/remediations/batch` Body

```json
{
  "cve_id": "CVE-2025-1234",
  "targets": [
    { "namespace": "payments", "cluster_name": "cluster-a" },
    { "namespace": "checkout", "cluster_name": "cluster-b" }
  ],
  "assigned_to": "alice",
  "target_date": "2026-03-31",
  "notes": "Upgrade the affected base image."
}
```

Behavior:

- Creates one `open` remediation per target with the shared assignee, target date, and notes. Returns the created records (`201`).
- `targets` holds 1 to 200 pairs; duplicate pairs are collapsed.
- All-or-nothing: the whole batch is rejected if any target is outside the caller's namespaces (`403`), does not currently contain the CVE (`404`), or already has a remediation for the CVE (`409`).
- Each record gets its own audit entry and assignee notification. CVE subscribers get one event covering all targets.

### `GET /api/remediations` Query Parameters

| Parameter | Type | Default | Notes |
|-----------|------|---------|-------|
| `status` | string | - | `open`, `in_progress`, `resolved`, `verified`, `wont_fix` |
| `cve_id` | string | - | Exact CVE ID |
| `cluster` | string | - | Scope filter |
| `namespace` | string | - | Scope filter |
| `assigned_to` | string | - | Exact assignee match |
| `overdue` | bool | - | Post-filter for `target_date < today` and status `open` or `in_progress` |

### Remediation response

Create, get, and update endpoints return remediation records with an `auto_resolved` boolean. It is `true` only when the status is `resolved`, `resolved_at` is set, and `resolved_by` is null, including historic scheduler resolutions. Manual resolution and reopening return `false`.

```json
{
  "id": "5a43f83c-4bd1-4f30-b628-7e683c05cf48",
  "cve_id": "CVE-2025-1234",
  "namespace": "payments",
  "cluster_name": "cluster-a",
  "status": "open",
  "assigned_to": null,
  "assigned_to_name": null,
  "created_by": "alice",
  "created_by_name": "Alice",
  "resolved_by": null,
  "resolved_by_name": null,
  "target_date": null,
  "notes": "Upgrade the affected base image.",
  "wont_fix_reason": null,
  "resolved_at": null,
  "verified_at": null,
  "created_at": "2026-11-10T12:00:00",
  "updated_at": "2026-11-10T12:00:00",
  "is_overdue": false,
  "auto_resolved": false
}
```

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
- `resolved` -> `in_progress`
- `verified` -> `in_progress` (legacy records only)
- `wont_fix` -> `open`

Special rules:

- An omitted field stays unchanged. An explicit `null` clears `assigned_to`, `target_date`, or `notes`.
- `assigned_to`, `target_date`, and `notes` can only change when the current or requested status is `open` or `in_progress`; otherwise the request fails with `400`.
- A changed `target_date` cannot be in the past (`400`). Sending an unchanged past date is allowed.
- A changed `target_date` notifies the creator and the assignee, excluding the acting user and a user assigned in the same request.
- `verified` cannot be set; it only exists on legacy records.
- `wont_fix` requires a non-blank `wont_fix_reason`. The backend trims it, stores it in the response field of the same name, and leaves `notes` unchanged.
- Moving back to `open` or `in_progress` clears prior resolution or verification timestamps when reopening from `resolved`, `verified`, or `wont_fix`. Reopening also clears `wont_fix_reason` and keeps `notes`; the audit log retains the reason.
- The scheduler auto-resolve leaves `notes` unchanged, keeps `resolved_by` null, and writes a `remediation_auto_resolved` audit entry.

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
- `ignore_thresholds`

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
- `Image` lists every affected image in the caller's scope, one per line; `Image Count` (`Anzahl Images`) holds the total
- `Component` (`Komponente`) lists every affected component as `name version`, one per line
- A cell that would exceed Excel's per-cell limits (32,767 characters, 250 lines) is cut off and ends with `… and N more` (`… und N weitere`)

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
- The data sheet (`CVE-Daten` or `CVE Data`) must contain the `CVE-ID`, justification and expiry date columns (German or English headers, any order). Other columns are ignored, so files from older exports stay importable.
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
| POST | `/api/dev/trigger-cve-subscription-diff` | Any dev user | Run the hourly CVE subscription diff now |
| POST | `/api/dev/trigger-cve-subscription-email` | Any dev user | Send the daily subscription summary emails now |
| POST | `/api/dev/trigger-notification-summary` | Any dev user | Send the daily notification summary emails now |
