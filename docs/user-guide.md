# User Guide

This guide follows the day-to-day workflows in the RHACS CVE Manager UI. Page names and actions are shown using the English UI labels.

See [Configuration](configuration.md) for threshold and notification settings, and [Security Model](security.md) for the namespace and RBAC rules behind what each user can see.

## Roles at a Glance

| User type | What they can do |
|----------|-------------------|
| `team_member` | Work on CVEs in accessible namespaces, request risk acceptances and suppression rules, create badges, create and update remediations |
| `sec_team` | Everything above plus approve or reject risk acceptances and suppression rules, change priorities, edit settings, review audit data, verify remediations |
| Wildcard all-namespace user | Still a `team_member`, but receives `X-Forwarded-Namespaces: *` from the spoke and can browse all namespaces without gaining `sec_team` actions |

!!! note
    Wildcard all-namespace access changes visibility scope, not role. These users still follow the non-security-team CVSS/EPSS thresholds and cannot approve risk acceptances or verify remediations.

## Dashboard

The **Dashboard** page is the operational starting point. Every card or chart is filtered to the namespaces the current user can access, except that `sec_team` sees the full fleet.

### Stat Cards

- **Total CVEs** links to the filtered **Vulnerabilities** list.
- **Fixable critical CVEs** jumps directly to critical CVEs with a known fix.
- **Escalations** shows active escalations and, when present, a subtitle for upcoming escalations.
- **Open risk acceptances** links to **Risk Acceptances** filtered to `requested`.

### Highlight Sections

- **Prioritized CVEs** shows CVEs manually prioritized by the security team.
- **High exploitation risk (EPSS)** highlights the CVEs with the highest exploit probability.

### Charts

- **EPSS Risk Matrix** plots each CVE as a point. The upper-right area represents the most urgent combination of severity and exploit probability.
- **Cluster Heatmap** compares clusters by severity distribution so you can spot hotspots quickly.
- **CVE Aging Distribution** groups CVEs by age based on `first_seen`, which helps identify long-running backlog.
- **Risk Acceptance Pipeline** is visible only to `sec_team` and links directly to `requested`, `approved`, `rejected`, and `expired` views.

## CVE Triage Workflow

The normal workflow starts in **Vulnerabilities**.

1. Open **Vulnerabilities** and apply filters such as severity, fixability, EPSS, namespace, cluster, component, or risk status.
2. Open a CVE detail page to review affected deployments, components, external references, escalation state, comments, and existing remediation or risk-acceptance records.
3. Decide on the handling path:
   - Fix it now: create a remediation in **Remediations** from the CVE detail page.
   - Accept the risk temporarily: create a request in **Risk Acceptances** from the same CVE context.
   - Raise urgency: if you are `sec_team`, add a manual priority so the CVE stays visible regardless of thresholds.

!!! tip
    Prioritized CVEs and CVEs with active risk acceptances stay visible even when they fall below the configured CVSS or EPSS thresholds.

## Risk Acceptance Lifecycle

Risk acceptances are requested from a specific CVE, not from a blank form on the list page.

1. Start from **Vulnerabilities** or the CVE detail page and choose **Request risk acceptance**.
2. Select the scope: `all`, `namespace`, `image`, or `deployment`.
3. Submit the justification and, optionally, an expiry date.
4. Track the record on **Risk Acceptances**.
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

Remediations are tracked on **Remediations** and are always namespace-scoped.

1. Start from a CVE detail page and choose **Start remediation**.
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

## False Positive Suppression

The **False Positives** page manages suppression rules for CVEs that are incorrectly reported by the scanner. A common case is when RHACS misidentifies a component version — for example, Grafana's internal Go module version `v0.0.0-*` being treated as the actual Grafana version, causing dozens of false CVE matches.

### Suppression Rule Types

| Type | Matches on | Use case |
|------|-----------|----------|
| **Component** | Component name + optional version pattern | A misidentified component produces many false CVEs (e.g., `github.com/grafana/grafana` at `v0.0.0-*`) |
| **CVE** | Single CVE ID | One-off false positive for a specific CVE |

### Creating a Suppression Rule

1. Open **False Positives** from the sidebar.
2. Click **Create Rule** and select the rule type.
3. For **Component** rules:
     - Enter the component name exactly as shown in the CVE detail's component list (e.g., `github.com/grafana/grafana`).
     - Optionally enter a version pattern using glob syntax (e.g., `v0.0.0-*` to match all pseudo-versions). Leave empty to suppress all versions.
4. For **CVE** rules:
     - Enter the CVE ID (e.g., `CVE-2024-12345`).
5. Provide a reason explaining why this is a false positive (minimum 10 characters).
6. Optionally add a reference URL linking to the upstream issue (e.g., a GitHub issue confirming the version misidentification).
7. Submit the rule.

### Review Workflow

- **Team members** create rules in `requested` status. The security team must approve before suppression takes effect.
- **Security team** creates rules directly in `approved` status, with immediate suppression effect.
- Approved rules suppress matched CVEs from the default CVE list and dashboard counts.
- Rejected rules have no effect and are kept for audit purposes.

### Visibility of Suppressed CVEs

- By default, suppressed CVEs are **hidden** from the CVE list and excluded from dashboard statistics.
- The CVE list supports a `show_suppressed` toggle to reveal suppressed CVEs with a visual indicator.
- CVEs with a pending suppression request (status `requested`) are **not** hidden but are marked with a "FP Requested" label.

### Interaction with Other Features

- Suppression is independent from risk acceptance — a CVE can have both.
- Suppressed CVEs are excluded from escalation triggers and notification generation.
- Component-level rules are especially powerful: one rule for `github.com/grafana/grafana` at `v0.0.0-*` eliminates all false positives from that misidentification in a single action.
- When the upstream issue is fixed (e.g., RHACS or the component corrects its version reporting), the security team can delete the rule and the CVEs will reappear automatically.

!!! tip
    Use component-level rules for systematic version misidentification issues. Reserve CVE-level rules for isolated false positives that don't share a common component pattern.

!!! note
    Suppression rules are org-wide. Unlike risk acceptances, they are not scoped to specific namespaces because scanner errors affect all users equally.

## Escalations

The **Escalations** page shows both active escalations and upcoming ones.

- Escalation rules are configured in **Settings**.
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

The **SVG Badges** page creates public badge URLs that render without authentication.

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

- Can see CVEs, escalations, badges, remediations, risk acceptances, and suppression rules in allowed namespaces.
- Can request or edit their own risk acceptances and suppression rules.
- Can create badges and remediations.
- Cannot approve risk acceptances or suppression rules, edit global settings, or verify remediations.

### `sec_team`

- Sees all namespaces.
- Can approve or reject risk acceptances and suppression rules.
- Can edit thresholds, escalation rules, and digest settings in **Settings**.
- Can verify remediations and manage priorities.
- Can review **Audit Log**.
- Can delete suppression rules.

### Wildcard all-namespace user

- Sees all namespaces because the spoke grants wildcard namespace scope.
- Stays a `team_member`.
- Can create badges across the fleet, but still cannot perform `sec_team` actions.
