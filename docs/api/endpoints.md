# API Endpoints

All endpoints are prefixed with `/api`. Authentication is required unless noted otherwise.

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | Any | Return the current user's profile |

**Response** (`GET /api/auth/me`):

```json
{
    "id": "dev-sec-1",
    "username": "Dev Security User",
    "email": "dev-sec@example.com",
    "role": "sec_team",
    "team_id": "550e8400-e29b-41d4-a716-446655440000",
    "is_sec_team": true
}
```

---

## CVEs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cves` | Any | List CVEs (paginated, filterable) |
| GET | `/api/cves/{cve_id}` | Any | Get CVE detail with deployments and components |
| GET | `/api/cves/{cve_id}/comments` | Any | List comments on a CVE |
| POST | `/api/cves/{cve_id}/comments` | Any | Add a comment to a CVE |
| GET | `/api/cves/{cve_id}/deployments` | Any | List affected deployments for a CVE |

### List CVEs Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number (1-indexed) |
| `page_size` | int | 50 | Items per page (1-200) |
| `search` | string | - | Filter by CVE ID substring |
| `severity` | int | - | Filter by severity level (1-4) |
| `fixable` | bool | - | Filter by fixability |
| `prioritized_only` | bool | false | Show only prioritized CVEs |
| `sort_by` | string | `severity` | Sort field: `severity`, `cvss`, `epss_probability`, `affected_deployments`, `first_seen`, `published_on` |
| `sort_desc` | bool | true | Sort descending |
| `cvss_min` | float | - | Minimum CVSS score (0-10) |
| `epss_min` | float | - | Minimum EPSS probability (0-1) |
| `namespaces` | string[] | - | Filter by namespace(s) |
| `component` | string | - | Filter by component name substring |
| `risk_status` | string | - | Filter by risk acceptance status: `any`, `requested`, `approved` |

!!! note "Prioritized CVEs are always listed first"
    Regardless of the selected sort column/direction, CVEs with a manual priority are always shown at the top of the list.

!!! note "Visibility rules"
    Team members only see CVEs in their assigned namespaces. CVEs must meet both CVSS and EPSS thresholds unless they have a manual priority or active risk acceptance.

---

## Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Any | Team dashboard data |
| GET | `/api/dashboard/sec` | sec_team | Security team dashboard data |

### Team Dashboard Response

```json
{
    "stat_total_cves": 42,
    "stat_escalations": 3,
    "stat_fixable_critical_cves": 7,
    "stat_open_risk_acceptances": 2,
    "severity_distribution": [
        {"severity": 4, "count": 7},
        {"severity": 3, "count": 15}
    ],
    "cves_per_namespace": [
        {"namespace": "production", "count": 28},
        {"namespace": "staging", "count": 14}
    ],
    "priority_cves": [...],
    "high_epss_cves": [...],
    "cve_trend": [
        {"date": "2026-02-22", "count": 38},
        {"date": "2026-02-23", "count": 40}
    ]
}
```

### Sec Dashboard Response

Includes org-wide metrics: `epss_matrix`, `cluster_heatmap`, `team_scoreboard`, `fixability_by_team`, `aging_distribution`, `risk_acceptance_pipeline`, plus aggregate stats (`total_cves`, `total_critical`, `avg_epss`, `total_teams`, `cves_last_7_days`, `threshold_preview`).

---

## Risk Acceptances

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/risk-acceptances` | team_member | Create a risk acceptance request |
| GET | `/api/risk-acceptances` | Any | List risk acceptances |
| GET | `/api/risk-acceptances/{id}` | Any | Get a single risk acceptance |
| PUT | `/api/risk-acceptances/{id}` | team_member | Update (resubmit) an approved/rejected acceptance |
| PATCH | `/api/risk-acceptances/{id}` | sec_team | Review (approve/reject) a risk acceptance |
| POST | `/api/risk-acceptances/{id}/comments` | Any | Add a comment |
| GET | `/api/risk-acceptances/{id}/comments` | Any | List comments |

### List Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `requested`, `approved`, `rejected`, `expired` |

### Create Request Body

```json
{
    "cve_id": "CVE-2024-1234",
    "justification": "Mitigated by network policy restricting access.",
    "scope": {
        "mode": "namespace",
        "targets": [
            {"cluster_name": "production", "namespace": "app-ns"}
        ]
    },
    "expires_at": "2026-06-01T00:00:00"
}
```

Scope modes: `all`, `namespace`, `image`, `deployment`. Targets are validated against the actual affected deployments for the CVE in the requesting team's namespaces.

### Review Request Body

```json
{
    "approved": true,
    "comment": "Accepted -- network isolation confirmed."
}
```

!!! note "Uniqueness constraint"
    Active acceptances (status `requested` or `approved`) are unique by `(team_id, cve_id, scope_key)`. Creating a duplicate returns HTTP 409.

---

## Priorities

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/priorities` | Any | List all prioritized CVEs |
| POST | `/api/priorities` | sec_team | Prioritize a CVE |
| PATCH | `/api/priorities/{id}` | sec_team | Update priority level/reason/deadline |
| DELETE | `/api/priorities/{id}` | sec_team | Remove prioritization |

### Create Request Body

```json
{
    "cve_id": "CVE-2024-5678",
    "priority": "critical",
    "reason": "Active exploitation observed in the wild.",
    "deadline": "2026-03-15T00:00:00"
}
```

Priority levels: `critical`, `high`, `medium`, `low`.

---

## Escalations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/escalations` | Any | List escalations (team-scoped for team_member) |

Escalation records are created by the background scheduler, not via API.

---

## Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Any | List notifications (last 50) |
| GET | `/api/notifications/unread-count` | Any | Get unread notification count |
| PATCH | `/api/notifications/{id}/read` | Any | Mark a notification as read |
| POST | `/api/notifications/read-all` | Any | Mark all notifications as read |

---

## Badges

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/badges` | Any | List badge tokens |
| POST | `/api/badges` | team_member | Create a badge token |
| DELETE | `/api/badges/{id}` | Any | Delete a badge token |
| GET | `/api/badges/{token}/status.svg` | **None** | Get badge SVG (public, no auth) |

### Create Request Body

```json
{
    "namespace": "production",
    "cluster_name": "cluster-1",
    "label": "Prod CVE Status"
}
```

The badge SVG endpoint is public and returns an SVG image showing CVE severity counts. Cached for 5 minutes.

---

## Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | sec_team | Get global settings |
| PATCH | `/api/settings` | sec_team | Update global settings |
| GET | `/api/settings/threshold-preview` | sec_team | Preview CVE counts for given thresholds |

### Threshold Preview Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `min_cvss` | float | Proposed minimum CVSS score (0-10) |
| `min_epss` | float | Proposed minimum EPSS probability (0-1) |

---

## Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/teams` | sec_team | List all teams |
| POST | `/api/teams` | sec_team | Create a team |
| GET | `/api/teams/{id}` | sec_team | Get a team |
| PATCH | `/api/teams/{id}` | sec_team | Update a team (name, email, namespaces) |
| DELETE | `/api/teams/{id}` | sec_team | Delete a team |

### Create/Update Request Body

```json
{
    "name": "Platform Team",
    "email": "platform@example.com",
    "namespaces": [
        {"namespace": "platform-prod", "cluster_name": "production"},
        {"namespace": "platform-staging", "cluster_name": "staging"}
    ]
}
```

---

## Namespaces

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/namespaces` | Any | List namespaces (all for sec_team, team-scoped otherwise) |

Returns `[{"namespace": "...", "cluster_name": "..."}]`. Sec team gets all namespaces from StackRox; team members get their assigned namespaces.

---

## Audit Log

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/audit-log` | sec_team | List audit log entries (paginated) |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `page_size` | int | 50 | Items per page (1-200) |

### Response Item

```json
{
    "id": "uuid",
    "user_id": "dev-sec-1",
    "username": "Dev Security User",
    "action": "priority_created",
    "entity_type": "cve_priority",
    "entity_id": "uuid",
    "details": {"status": "approved"},
    "created_at": "2026-02-28T14:30:00"
}
```

Tracked actions: `team_created`, `team_updated`, `team_deleted`, `priority_created`, `priority_updated`, `priority_deleted`, `risk_acceptance_created`, `risk_acceptance_updated`, `risk_acceptance_reviewed`, `settings_updated`.
