# User Guide

This guide follows the day-to-day workflows in the RHACS CVE Manager UI. Page names are shown as they appear in the application, which is localized in German.

See [Configuration](configuration.md) for threshold and notification settings, and [Security Model](security.md) for the namespace and RBAC rules behind what each user can see.

## Roles at a Glance

| User type | What they can do |
|----------|-------------------|
| `team_member` | Work on CVEs in accessible namespaces, request risk acceptances, create badges, create and update remediations |
| `sec_team` | Everything above plus approve or reject risk acceptances, change priorities, edit settings, review audit data, verify remediations |
| Wildcard all-namespace user | Still a `team_member`, but receives `X-Forwarded-Namespaces: *` from the spoke and can browse all namespaces without gaining `sec_team` actions |

!!! note
    Wildcard all-namespace access changes visibility scope, not role. These users still follow the non-security-team CVSS/EPSS thresholds and cannot approve risk acceptances or verify remediations.

## Dashboard

The **Dashboard** page is the operational starting point. Every card or chart is filtered to the namespaces the current user can access, except that `sec_team` sees the full fleet.

### Stat Cards

- **Gesamt CVEs** links to the filtered **Schwachstellen** list.
- **Behebbare kritische CVEs** jumps directly to critical CVEs with a known fix.
- **Eskalationen** shows active escalations and, when present, a subtitle for upcoming escalations.
- **Offene Risikoakzeptanzen** links to **Risikoakzeptanzen** filtered to `requested`.

### Highlight Sections

- **Priorisierte CVEs** shows CVEs manually prioritized by the security team.
- **Hohes Ausnutzungsrisiko (EPSS)** highlights the CVEs with the highest exploit probability.

### Charts

- **EPSS-Risikomatrix** plots each CVE as a point. The upper-right area represents the most urgent combination of severity and exploit probability.
- **Cluster-Heatmap** compares clusters by severity distribution so you can spot hotspots quickly.
- **CVE-Alterungsverteilung** groups CVEs by age based on `first_seen`, which helps identify long-running backlog.
- **Risikoakzeptanz-Pipeline** is visible only to `sec_team` and links directly to `requested`, `approved`, `rejected`, and `expired` views.

## CVE Triage Workflow

The normal workflow starts in **Schwachstellen**.

1. Open **Schwachstellen** and apply filters such as severity, fixability, EPSS, namespace, cluster, component, or risk status.
2. Open a CVE detail page to review affected deployments, components, external references, escalation state, comments, and existing remediation or risk-acceptance records.
3. Decide on the handling path:
   - Fix it now: create a remediation in **Behebungen** from the CVE detail page.
   - Accept the risk temporarily: create a request in **Risikoakzeptanzen** from the same CVE context.
   - Raise urgency: if you are `sec_team`, add a manual priority so the CVE stays visible regardless of thresholds.

!!! tip
    Prioritized CVEs and CVEs with active risk acceptances stay visible even when they fall below the configured CVSS or EPSS thresholds.

## Risk Acceptance Lifecycle

Risk acceptances are requested from a specific CVE, not from a blank form on the list page.

1. Start from **Schwachstellen** or the CVE detail page and choose **Risikoakzeptanz beantragen**.
2. Select the scope: `all`, `namespace`, `image`, or `deployment`.
3. Submit the justification and, optionally, an expiry date.
4. Track the record on **Risikoakzeptanzen**.
5. `sec_team` reviews the request and approves or rejects it.
6. If rejected or previously approved, the original creator can edit and resubmit it, which resets the status to `requested`.
7. Approved requests expire automatically when `expires_at` is reached.

!!! warning
    Only `sec_team` can approve or reject risk acceptances.

### Scope Rules

- Scopes are validated against real affected deployments for that CVE.
- Active records are unique per `(cve_id, scope_key)`, so you cannot create a second requested or approved acceptance for the same normalized scope.
- A request with scope mode `all` is visible to any user who has at least one namespace.

## Remediation Lifecycle

Remediations are tracked on **Behebungen** and are always namespace-scoped.

1. Start from a CVE detail page and choose **Behebung starten**.
2. Pick the affected namespace and optional assignee, target date, or notes.
3. Move the remediation through the lifecycle: `open`, `in_progress`, `resolved`, `verified`.
4. If the work is intentionally not going to happen, use `wont_fix` and provide a reason.
5. Reopen when needed:
   - `in_progress` can move back to `open`
   - `resolved` and `verified` can move back to `in_progress`
   - `wont_fix` can move back to `open`

!!! warning
    Only `sec_team` can move a remediation to `verified`.

!!! note
    The scheduler can auto-mark an `open` or `in_progress` remediation as `resolved` if StackRox no longer reports that CVE in the namespace's deployments.

## Escalations

The **Eskalationen** page shows both active escalations and upcoming ones.

- Escalation rules are configured in **Einstellungen**.
- Each rule combines a minimum severity threshold with an EPSS threshold and three deadlines.
- A CVE is eligible for a rule when either the severity threshold or the EPSS threshold matches that rule.
- Levels are:
  - Level 1: user notification
  - Level 2: user and security notification
  - Level 3: management escalation
- The warning period comes from `escalation_warning_days` and is used for the upcoming-escalation preview.

!!! note
    CVEs with approved risk acceptances are skipped during escalation checks.

## Badges

The **SVG-Badges** page creates public badge URLs that render without authentication.

### Creating a Badge

- Leave namespace and cluster empty for a general badge.
- Set namespace and cluster for a namespace-specific badge.
- For ordinary team members, a badge without an explicit namespace stores the user's current namespace list as a fixed scope.
- For wildcard all-namespace users, a badge without an explicit namespace remains dynamic and covers all namespaces.

### Embedding

=== "Markdown"

    ```md
    ![CVE Badge](https://example.invalid/api/badges/<token>/status.svg)
    ```

=== "HTML"

    ```html
    <img src="https://example.invalid/api/badges/<token>/status.svg" alt="CVE Badge">
    ```

The frontend can copy either the raw badge URL or a ready-made Markdown snippet.

!!! tip
    On OpenShift, set `BADGE_BASE_URL` to the hub API route so external badge consumers can fetch the SVG without passing through the frontend route and its oauth-proxy.

## Notifications and Weekly Digest

Notifications appear in the bell menu and are stored per user.

- The API returns the latest 50 notifications.
- Unread counts refresh in the UI every 30 seconds.
- The weekly digest is sent to the configured management email on the configured weekday.
- Risk-acceptance creators also receive email when `sec_team` comments on or reviews their request.
- Overdue remediations and expiring risk acceptances also create notifications.

## Practical Differences Between Roles

### `team_member`

- Can see CVEs, escalations, badges, remediations, and risk acceptances in allowed namespaces.
- Can request or edit their own risk acceptances.
- Can create badges and remediations.
- Cannot approve risk acceptances, edit global settings, or verify remediations.

### `sec_team`

- Sees all namespaces.
- Can approve or reject risk acceptances.
- Can edit thresholds, escalation rules, and digest settings in **Einstellungen**.
- Can verify remediations and manage priorities.
- Can review **Audit-Log**.

### Wildcard all-namespace user

- Sees all namespaces because the spoke grants wildcard namespace scope.
- Stays a `team_member`.
- Can create badges across the fleet, but still cannot perform `sec_team` actions.
