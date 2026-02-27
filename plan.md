# RHACS CVE Manager - Project Plan

## Summary

A self-service web application that lets teams manage their CVEs independently and collaborate with the security team on risk acceptance workflows. Each team only sees CVEs from their own namespaces; the security team has full visibility plus a dedicated monitoring dashboard.

Key design principle: **EPSS-driven prioritization**. Only ~5% of CVEs are ever exploited. The app uses EPSS probability alongside CVSS to surface what actually matters, and lets the sec team configure minimum thresholds so teams aren't overwhelmed by noise.

---

## 1. Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────────┐
│  React / Vite   │──REST──│  Python Backend   │──SQL──▶│  StackRox Central   │
│  (SPA, German)  │        │  (FastAPI)        │        │  PostgreSQL (ro)    │
└─────────────────┘        │                   │──SQL──▶│  App DB (rw)        │
                           │                   │──SMTP─▶│  Mailserver         │
                           └──────────────────┘        └─────────────────────┘
```

### Databases

- **StackRox Central DB** (read-only): `central_active` on the PostgreSQL in the `stackrox` namespace. Source for clusters, namespaces, deployments, images, CVEs, components.
- **App DB** (read-write): Separate database for team assignments, risk acceptance workflows, priorities, configuration, audit log, badge tokens, escalation rules, in-app notifications.

### Tech Stack

| Layer      | Technology                                                    |
|------------|---------------------------------------------------------------|
| Frontend   | React 19, Vite, TanStack Query, Recharts, PatternFly 5       |
| Backend    | Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, **Pydantic v2** |
| Packaging  | **uv** (dependency management, lockfile, virtualenv)          |
| Auth       | OpenShift OAuth / OIDC (existing identity provider)           |
| DB         | PostgreSQL (existing for StackRox, separate for app)          |
| Mail       | SMTP via `aiosmtplib`                                         |
| Container  | Containerfile, no internet at runtime                         |

> **Why PatternFly?** Official Red Hat design system, visually consistent with the OpenShift console, fully offline-capable (npm package), includes Red Hat fonts in the bundle.

> **Why uv?** Fast, deterministic dependency resolution with lockfile (`uv.lock`). Replaces pip, pip-tools, and virtualenv in one tool. Ideal for reproducible container builds.

---

## 2. Data Model (App DB)

All models use **Pydantic v2** for validation, serialization, and API schemas. SQLAlchemy models map 1:1 to Pydantic schemas via `model_validate`.

### 2.1 `teams`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| name         | VARCHAR      | Team name                       |
| email        | VARCHAR      | Team email for notifications    |
| created_at   | TIMESTAMP    |                                 |

### 2.2 `team_namespaces`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| team_id      | FK teams     |                                 |
| namespace    | VARCHAR      | Namespace name                  |
| cluster_name | VARCHAR      | Cluster name                    |

### 2.3 `users`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| username     | VARCHAR      | From OIDC                       |
| email        | VARCHAR      |                                 |
| role         | ENUM         | `team_member`, `sec_team`       |
| team_id      | FK teams     | NULL for sec_team               |

### 2.4 `risk_acceptances`
| Column          | Type         | Description                         |
|-----------------|--------------|-------------------------------------|
| id              | UUID PK      |                                     |
| cve_id          | VARCHAR      | e.g. CVE-2024-1234                  |
| team_id         | FK teams     | Requesting team                     |
| status          | ENUM         | `requested`, `approved`, `rejected`, `expired` |
| justification   | TEXT         | Team's reasoning                    |
| scope           | JSONB        | Affected images/namespaces          |
| expires_at      | TIMESTAMP    | Acceptance expiry date              |
| created_at      | TIMESTAMP    |                                     |
| created_by      | FK users     |                                     |
| reviewed_by     | FK users     | Sec team member                     |
| reviewed_at     | TIMESTAMP    |                                     |

### 2.5 `risk_acceptance_comments`
| Column              | Type         | Description                     |
|---------------------|--------------|---------------------------------|
| id                  | UUID PK      |                                 |
| risk_acceptance_id  | FK risk_acc  |                                 |
| user_id             | FK users     | Author                          |
| message             | TEXT         | Comment text                    |
| created_at          | TIMESTAMP    |                                 |

Both team members and sec team can comment. Each new comment triggers an in-app notification + email to the other party.

### 2.6 `cve_priorities`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| cve_id       | VARCHAR      | CVE identifier                  |
| priority     | ENUM         | `critical`, `high`, `medium`, `low` |
| reason       | TEXT         | Justification                   |
| set_by       | FK users     | Sec team member                 |
| deadline     | TIMESTAMP    | Remediation deadline            |
| created_at   | TIMESTAMP    |                                 |

### 2.7 `global_settings`
| Column              | Type    | Description                                    |
|---------------------|---------|------------------------------------------------|
| id                  | UUID PK |                                                |
| min_cvss_score      | NUMERIC | CVEs below this CVSS are hidden from teams     |
| min_epss_score      | NUMERIC | CVEs below this EPSS probability are hidden    |
| escalation_rules    | JSONB   | Escalation timing config (see 4.5)             |
| digest_day          | INTEGER | Day of week for weekly digest (0=Mon)          |
| updated_by          | FK users|                                                |
| updated_at          | TIMESTAMP |                                              |

The sec team configures these thresholds. CVEs that fall below **both** min_cvss and min_epss are hidden from team dashboards (sec team always sees everything). This prevents teams from being overwhelmed by thousands of low-risk CVEs.

### 2.8 `escalations`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| cve_id       | VARCHAR      |                                 |
| team_id      | FK teams     |                                 |
| level        | INTEGER      | Escalation level (1, 2, 3)      |
| triggered_at | TIMESTAMP    |                                 |
| notified     | BOOLEAN      |                                 |

### 2.9 `badge_tokens`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| team_id      | FK teams     |                                 |
| namespace    | VARCHAR      | Optional: per-namespace badge   |
| token        | VARCHAR      | Public token for badge URL      |
| created_at   | TIMESTAMP    |                                 |

### 2.10 `notifications`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| user_id      | FK users     | Recipient                       |
| type         | VARCHAR      | e.g. `risk_comment`, `risk_approved`, `escalation`, `new_priority` |
| title        | VARCHAR      | Short notification title        |
| message      | TEXT         | Notification body               |
| link         | VARCHAR      | Deep link to relevant page      |
| read         | BOOLEAN      | Default false                   |
| created_at   | TIMESTAMP    |                                 |

In-app notification bell in the header. Unread count badge. Clicking a notification navigates to the relevant item.

### 2.11 `audit_log`
| Column       | Type         | Description                     |
|--------------|--------------|---------------------------------|
| id           | UUID PK      |                                 |
| user_id      | FK users     |                                 |
| action       | VARCHAR      | e.g. `risk_acceptance_created`  |
| entity_type  | VARCHAR      |                                 |
| entity_id    | VARCHAR      |                                 |
| details      | JSONB        |                                 |
| created_at   | TIMESTAMP    |                                 |

---

## 3. StackRox Central DB - Relevant Tables (Read-Only)

Data is read via SQL from `central_active`. Core query path:

```
clusters
  └── namespaces (clusterid)
        └── deployments (namespaceid)
              └── deployments_containers (deployments_id)
                    └── images (image_id)
                          ├── image_cve_edges (imageid)
                          │     └── image_cves (id = imagecveid)
                          │         → severity, cvss, epss_probability, impactscore
                          └── image_component_edges (imageid)
                                └── image_components (id)
                                      └── image_component_cve_edges (imagecomponentid)
                                          → isfixable, fixedby
```

Key fields:
- **image_cves**: `cvebaseinfo_cve`, `severity` (0=UNKNOWN, 1=LOW, 2=MODERATE, 3=IMPORTANT, 4=CRITICAL), `cvss`, `impactscore`, `cvebaseinfo_epss_epssprobability`
- **image_component_cve_edges**: `isfixable`, `fixedby` (available fix version)
- **deployments**: `namespace`, `clustername`, `name`
- Current data: 9 clusters, ~1000 namespaces, ~2500 deployments, ~785 images, ~4400 CVEs, ~18500 components

---

## 4. Features

### 4.1 Team Dashboard
- **EPSS Highlight Zone**: Top widget showing CVEs with high EPSS probability (likely to be exploited). This is the most actionable metric.
- Donut chart: CVEs by severity (Critical/Important/Moderate/Low)
- Bar chart: CVEs per namespace
- Trend line: CVE count over time (based on `firstimageoccurrence`)
- Stat cards: Total CVEs, Fixable CVEs, Open Risk Acceptances, Overdue Deadlines, Avg EPSS of open CVEs
- Auto-filters to team namespaces only
- CVEs below the sec-team-configured CVSS/EPSS thresholds are hidden

### 4.2 Sec Team Monitoring Dashboard
A dedicated overview for the security team with org-wide visibility:

- **EPSS Risk Matrix**: Scatter plot with CVSS on Y-axis and EPSS probability on X-axis. Top-right quadrant (high CVSS + high EPSS) = immediate action needed. Each dot is a CVE, colored by severity.
- **Threat Landscape Heatmap**: Matrix of clusters x severity showing CVE density per cluster
- **Team Health Scoreboard**: Table of all teams ranked by risk score (weighted by EPSS + CVSS + age + fixability). Shows: team name, total CVEs, critical CVEs, avg EPSS, overdue items, open risk acceptances
- **Fixability Overview**: Stacked bar chart showing fixable vs unfixable CVEs per team — highlights quick wins
- **Aging Analysis**: Distribution chart of CVE age (days since first occurrence). Highlights CVEs that have been open for too long.
- **Escalation Tracker**: Active escalations grouped by level and team
- **Risk Acceptance Pipeline**: Funnel/kanban showing pending → approved → expired acceptances
- **Threshold Configuration Panel**: Inline controls to adjust min CVSS and min EPSS scores. Preview showing how many CVEs would be filtered at different thresholds.
- **Trend Charts**: Week-over-week total CVEs, new CVEs, resolved CVEs, mean EPSS across the org

### 4.3 CVE List & Detail
- Table with sorting/filtering: CVE ID, Severity, CVSS, **EPSS Probability**, Affected Images, Fixable (yes/no), Fix Version
- **EPSS column highlighted** — sortable, with color gradient (green < 0.1, yellow 0.1-0.5, red > 0.5)
- Detail view: Affected deployments, components, all images carrying the CVE
- Quick actions: Request risk acceptance, link to external CVE databases (NVD link pre-built, works offline since it's just a link)

### 4.4 Risk Acceptance Workflow
1. **Team requests**: Selects CVE, defines scope (image/namespace), writes justification, sets desired expiry
2. **Sec team reviews**: Sees all pending requests, can approve/reject
3. **Comment thread**: Both sides can comment on the request at any time. Each comment triggers:
   - In-app notification to the other party (notification bell)
   - Email notification
4. **Status changes** (approved/rejected/expired) trigger:
   - In-app notification with deep link
   - Email notification
5. **Expiry**: Approved acceptances expire automatically, team is notified in advance (7 days before)
6. **Audit**: All changes logged

### 4.5 CVE Prioritization by Sec Team
- Sec team can manually prioritize CVEs (`critical`/`high`/`medium`/`low`) independent of CVSS/EPSS
- Sets remediation deadlines
- Prioritized CVEs appear highlighted on team dashboards with a banner
- When a CVE is prioritized, all affected teams receive:
  - In-app notification
  - Email notification
- Filter: "Show only prioritized CVEs"

### 4.6 EPSS/CVSS Threshold Configuration
- Sec team configures minimum CVSS and EPSS scores in settings
- CVEs below **both** thresholds are hidden from team views (not from sec team)
- Preview mode: "At these thresholds, X of Y CVEs would be visible to teams"
- Manually prioritized CVEs are **always visible** regardless of thresholds
- CVEs with active risk acceptances are **always visible** regardless of thresholds

### 4.7 Automatic Escalation
- Configurable rules (e.g. "Critical CVE with EPSS > 0.7 unresolved after 7 days → Level 1")
- Level 1: In-app notification + email to team
- Level 2: In-app notification + email to team + sec team (after X more days)
- Level 3: Email to configured management address
- Background cron job checks daily
- EPSS probability is factored into escalation urgency

### 4.8 In-App Notifications
- Notification bell icon in the top navigation bar with unread count badge
- Notification dropdown showing recent notifications grouped by type
- Each notification has: icon, title, short message, timestamp, link to relevant page
- Mark as read (individual or all)
- Notification types:
  - `risk_comment` — Someone commented on a risk acceptance
  - `risk_approved` / `risk_rejected` — Risk acceptance status changed
  - `risk_expiring` — Risk acceptance expiring soon
  - `new_priority` — Sec team prioritized a CVE affecting your namespace
  - `escalation` — CVE escalated
  - `new_critical_cve` — New critical CVE with high EPSS detected in your namespace

### 4.9 Email Notifications (SMTP)
- New prioritization by sec team
- Risk acceptance: status changes + new comments
- Escalations
- Weekly digest: summary of new/open CVEs, EPSS highlights
- Configurable per team (opt-in/opt-out per category)
- HTML email templates (embedded, no external resources)

### 4.10 Badges
- SVG badges generated locally (Shields.io-style format, no internet needed)
- Endpoint: `GET /api/badges/{token}/status.svg`
- Shows e.g. "CVEs: 3 critical | 12 high" or "No critical CVEs" with color coding
- Color: red (critical present), yellow (high present), green (none above moderate)
- Team generates token in the app, embeds badge URL in repo README
- No auth needed (token is unguessable, read-only access to counters)

### 4.11 Offline Capability
- All npm packages bundled at build time
- No CDN dependencies at runtime
- Fonts (Red Hat Font via PatternFly) included in build
- Backend dependencies installed via `uv sync` and baked into container

### 4.12 Localization
- Full UI in German
- i18n framework (react-i18next) for future extensibility
- Date formats: DD.MM.YYYY, numbers: 1.234,56

---

## 5. API Endpoints

```
# Dashboard
GET    /api/dashboard                         # Team dashboard stats + chart data
GET    /api/dashboard/sec                     # Sec team monitoring dashboard

# CVEs
GET    /api/cves                              # CVE list (filtered by team, thresholds)
GET    /api/cves/{cve_id}                     # CVE detail
GET    /api/cves/{cve_id}/deployments         # Affected deployments

# Namespaces
GET    /api/namespaces                        # Team's namespaces

# Risk Acceptances
POST   /api/risk-acceptances                  # Request risk acceptance
GET    /api/risk-acceptances                  # List (team's own or all for sec)
PATCH  /api/risk-acceptances/{id}             # Approve/reject (sec team)
POST   /api/risk-acceptances/{id}/comments    # Add comment
GET    /api/risk-acceptances/{id}/comments    # List comments

# Priorities
GET    /api/priorities                        # Prioritized CVEs
POST   /api/priorities                        # Prioritize CVE (sec team)
PATCH  /api/priorities/{id}                   # Update priority
DELETE /api/priorities/{id}                   # Remove priority

# Escalations
GET    /api/escalations                       # Active escalations

# Notifications
GET    /api/notifications                     # User's notifications
PATCH  /api/notifications/{id}/read           # Mark as read
POST   /api/notifications/read-all            # Mark all as read

# Badges
GET    /api/badges/{token}/status.svg         # Badge (public, no auth)
POST   /api/badges                            # Create badge token
GET    /api/badges                            # List team's badges
DELETE /api/badges/{id}                       # Revoke badge token

# Settings (sec team)
GET    /api/settings                          # Current settings
PATCH  /api/settings                          # Update thresholds/escalation rules
GET    /api/settings/threshold-preview        # Preview CVE count at given thresholds

# Teams (sec team)
GET    /api/teams                             # List teams
POST   /api/teams                             # Create team
PATCH  /api/teams/{id}                        # Update team
GET    /api/teams/{id}/stats                  # Team health stats

# Audit
GET    /api/audit-log                         # Audit log (sec team)

# Auth
GET    /api/auth/me                           # Current user info
```

---

## 6. Pydantic Models (Examples)

All request/response schemas are Pydantic v2 `BaseModel` subclasses. SQLAlchemy ORM models are validated through Pydantic via `model_validate(orm_obj, from_attributes=True)`.

```python
# Example: CVE response schema
class CveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cve_id: str
    severity: Severity          # Enum
    cvss: float
    epss_probability: float     # 0.0 - 1.0
    impact_score: float
    fixable: bool
    fixed_by: str | None
    affected_images: int
    affected_deployments: int
    has_priority: bool
    has_risk_acceptance: bool

# Example: Risk acceptance request
class RiskAcceptanceCreate(BaseModel):
    cve_id: str = Field(pattern=r"^CVE-\d{4}-\d+$")
    justification: str = Field(min_length=10, max_length=2000)
    scope: RiskScope
    expires_at: datetime

# Example: Settings update (sec team)
class SettingsUpdate(BaseModel):
    min_cvss_score: float = Field(ge=0.0, le=10.0)
    min_epss_score: float = Field(ge=0.0, le=1.0)
    escalation_rules: EscalationRules
```

---

## 7. Project Structure

```
rhacs-manager/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + lifespan
│   │   ├── config.py               # Settings (Pydantic Settings)
│   │   ├── database.py             # SQLAlchemy engine setup (2 DBs)
│   │   ├── models/                 # SQLAlchemy ORM models (app DB)
│   │   ├── schemas/                # Pydantic v2 request/response schemas
│   │   ├── routers/                # API routers (dashboard, cves, risk, ...)
│   │   ├── services/               # Business logic
│   │   ├── stackrox/               # Read-only queries against Central DB
│   │   ├── auth/                   # OIDC / OAuth middleware
│   │   ├── mail/                   # SMTP service + templates
│   │   ├── badges/                 # SVG badge generator
│   │   ├── notifications/          # In-app notification service
│   │   └── tasks/                  # Background jobs (escalation, digest)
│   ├── alembic/                    # DB migrations
│   ├── tests/
│   ├── pyproject.toml              # Project metadata + dependencies (uv)
│   ├── uv.lock                     # Deterministic lockfile
│   └── Containerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── i18n/                   # German translations
│   │   ├── api/                    # API client (TanStack Query)
│   │   ├── components/
│   │   │   ├── notifications/      # Bell icon, dropdown, notification items
│   │   │   ├── charts/             # Reusable chart components
│   │   │   └── common/             # Shared UI components
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # Team dashboard
│   │   │   ├── SecDashboard.tsx    # Sec team monitoring dashboard
│   │   │   ├── CveList.tsx
│   │   │   ├── CveDetail.tsx
│   │   │   ├── RiskAcceptances.tsx
│   │   │   ├── RiskAcceptanceDetail.tsx  # With comment thread
│   │   │   ├── Priorities.tsx
│   │   │   ├── Escalations.tsx
│   │   │   ├── Settings.tsx        # Sec team: thresholds, escalation rules
│   │   │   ├── TeamAdmin.tsx
│   │   │   └── AuditLog.tsx
│   │   └── hooks/                  # Custom hooks
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── Containerfile
├── deploy/
│   ├── kustomize/                  # OpenShift deployment manifests
│   └── helm/                       # Alternative: Helm chart
├── plan.md
└── CLAUDE.md
```

---

## 8. Implementation Order

### Phase 1: Foundation
1. Backend: FastAPI project with `pyproject.toml` + `uv`, dual-database setup, Pydantic Settings, auth middleware
2. Frontend: Vite project, PatternFly, i18n (German), router, auth flow
3. App DB: Alembic migrations for all tables
4. StackRox queries: CVEs, deployments, images per namespace

### Phase 2: Core Features
5. Team dashboard with charts and stat cards (EPSS highlight zone)
6. CVE list with filtering, sorting, EPSS column
7. CVE detail view

### Phase 3: Sec Team Dashboard
8. Sec team monitoring dashboard (EPSS risk matrix, team scoreboard, heatmap, etc.)
9. Threshold configuration panel with preview

### Phase 4: Workflows
10. Risk acceptance workflow (request + review)
11. Comment threads on risk acceptances
12. In-app notifications (bell, dropdown, mark-as-read)
13. CVE prioritization by sec team

### Phase 5: Automation & Communication
14. Automatic escalation (cron job, EPSS-aware)
15. SMTP email notifications
16. Badge generator

### Phase 6: Admin & Polish
17. Team management
18. Audit log view
19. Containerfiles (multi-stage builds, `uv sync --frozen` for reproducibility)
20. Kustomize/Helm manifests for OpenShift

---

## 9. Additional Feature Ideas (not yet planned)

The following ideas could be added — I'll only implement them after your approval:

1. **Cluster-level CVE exceptions**: Sec team can globally accept CVEs for certain base images (e.g. known CVEs in ubi8-minimal)
2. **Image lifecycle tracking**: Show which images are outdated and how long since their last update
3. **SLA reporting**: Automatic reports on remediation deadline compliance per team (PDF/CSV export)
4. **Webhook integration**: Besides SMTP, webhook support (e.g. for Rocket.Chat/Mattermost)
5. **Extended RBAC**: More granular roles (team lead, viewer, editor) instead of just team_member/sec_team
6. **Dark mode**: PatternFly supports dark mode natively
7. **CVE trend per team**: Historical analysis of how each team's CVE numbers evolved over months
8. **EPSS trend tracking**: Track how EPSS scores change over time for specific CVEs (EPSS scores are updated regularly by FIRST.org)
