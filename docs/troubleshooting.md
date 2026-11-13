# Troubleshooting

This page covers failure modes verified against the current backend, spoke proxy, and scheduler code. For deployment-specific setup, see [Deployment](deployment/index.md). For RBAC and header flow, see [Security Model](security.md).

## StackRox DB Connection Failures

Symptoms include startup failures when the backend initializes the StackRox async engine or empty CVE data because the connection never succeeds.

### Checks

- Confirm `STACKROX_DB_URL` or the split `STACKROX_DB_HOST`, `STACKROX_DB_PORT`, `STACKROX_DB_USER`, `STACKROX_DB_PASSWORD`, and `STACKROX_DB_NAME` values are set correctly.
- On OpenShift, verify the `central-db-password` secret was copied into the RHACS CVE Manager namespace before deploying the hub backend.
- Make sure the network path from the backend pod to the StackRox PostgreSQL service is reachable.
- Use a read-only StackRox account. The backend creates the StackRox engine with PostgreSQL read-only execution options.

!!! warning
    The app DB and the StackRox DB are configured independently. A working app database does not prove the StackRox connection is correct.

## Backend Not Ready: `stackrox_schema`

Symptoms: backend pods never become ready, `GET /ready` returns `503` with a `stackrox_schema` check such as `missing: image_cves_v2.origin (ACS >= 4.11.6)`, and the startup log contains `StackRox Central DB schema is too old for RHACS Manager`.

### Checks

- The connected Central runs an RHACS release older than the minimum (**4.11.6**). Upgrade Central, or point `STACKROX_DB_*` at the right database.
- The initial escalation check is skipped while the schema is incompatible, so no escalations are created against the old database.

## SMTP Delivery Issues

The mail sender uses `aiosmtplib.send()` with `use_tls`, `start_tls`, and `validate_certs` directly from environment variables.

### Checks

- Use `SMTP_TLS=true` only for implicit TLS/SMTPS, typically port 465.
- Use `SMTP_STARTTLS=true` for opportunistic STARTTLS, typically port 587.
- Do not enable both unless your server explicitly supports that combination.
- If you use internal or self-signed certificates, set `SMTP_VALIDATE_CERTS=false` only as a deliberate exception.
- Confirm `SMTP_FROM`, `SMTP_USER`, and `SMTP_PASSWORD` match what the relay expects.

### Users receive no mention or risk-acceptance emails

Emails to users are skipped (in-app notification only) when the stored address is invalid. The backend logs `Skipping email: invalid recipient address` with the `user_id` and `purpose`.

- Check `SELECT username, email FROM users;` in the app DB. `<user>@cluster.local` or `<user>@spoke.local` are placeholders, not mailboxes.
- In spoke mode the real address comes from the OpenShift Identity `extra.email`. Check it with `oc get identity -o custom-columns=NAME:.metadata.name,EMAIL:.extra.email`. If it is empty, map the email claim in the cluster OAuth identity provider.
- If the identity has an email, look for `failed to resolve identity email` in the auth-header-injector logs. A `forbidden` error means the injector ClusterRole lacks `get` on `identities`.
- A stored address is updated on the user's next request after the injector resolves it.

## Session Expired / 403 After Inactivity

If the OpenShift OAuth proxy session expires, API requests receive its HTML sign-in page with HTTP 403. The app shows one blocking **Session expired** dialog (**Sitzung abgelaufen** in German), even if your name is still visible in the masthead. Choose **Log in again** (**Neu anmelden**) to sign in and return to the same page, including its filters and anchor. There is no automatic redirect; signing in reloads the page and discards unsaved input. Backend JSON 403 permission errors still appear as ordinary errors and do not open this dialog.

Session validity depends on both proxy revalidation and OpenShift OAuth limits:

- Hub: `frontend.oauthProxy.cookieRefresh`, default `12h`.
- Spoke: `spoke.oauthProxy.cookieRefresh`, default `12h`.
- The refresh interval controls when the proxy revalidates the OpenShift token. It does not guarantee a session of that length or impose a fixed maximum session age: a valid session can be refreshed, while an expired or invalid token ends it.
- OpenShift OAuth token lifetime (`spec.tokenConfig.accessTokenMaxAgeSeconds`) and the configured inactivity timeout (`spec.tokenConfig.accessTokenInactivityTimeout`, or an OAuth client override) bound token validity. The Helm chart cannot extend these cluster or client limits. Ask a cluster administrator to review them if sessions expire too soon.

See the [OAuth proxy authentication and redirect implementation](https://github.com/openshift/oauth-proxy/blob/release-4.22/oauthproxy.go) and [OpenShift OAuth configuration](https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/authentication_and_authorization/configuring-internal-oauth).

## Spoke Proxy Authentication Failures

If users can reach the spoke route but the hub API responds with authentication errors, check the spoke header path first.

### API key mismatch

- The hub accepts spoke requests only when `X-Api-Key` matches an entry in `SPOKE_API_KEYS`.
- The spoke secret `SPOKE_API_KEY` must match one of those values exactly.

### Missing forwarded headers

- The backend requires `X-Forwarded-User` in spoke mode.
- Namespace scope comes from `X-Forwarded-Namespaces`.
- Group-based role mapping depends on `X-Forwarded-Groups`.
- The auth-header-injector prefers `X-Forwarded-Access-Token` so it can resolve groups via the OpenShift user API; it falls back to existing `X-Forwarded-Groups` only when no groups were resolved from the API and `TRUST_FORWARDED_GROUPS=true` is set (off by default, the header is stripped otherwise).
- Intermittent `503` responses with `Retry-After: 5` come from the injector when the OpenShift user API call fails. Check the injector logs for `failed to fetch user info`.

### Namespace annotation format

- User annotation values must be comma-separated usernames.
- Group annotation values must be comma-separated group names.
- Escalation contact annotation values are a single email address.

```yaml
metadata:
  annotations:
    rhacs-manager.io/users: "alice,bob"
    rhacs-manager.io/groups: "payments-oncall,platform-sec"
    rhacs-manager.io/escalation-email: "payments-escalation@example.com"
```

## Namespace Annotation Not Taking Effect

The auth-header-injector does not watch namespaces continuously. It refreshes its in-memory cache on a timer.

### Checks

- Wait for the next `CACHE_TTL_SECONDS` refresh cycle. The default is 300 seconds.
- If the problem is group-based access, remember that user-group lookups are cached separately for `GROUP_CACHE_TTL_SECONDS` seconds. The default is 60.
- Verify that the annotation key names match the configured `NAMESPACE_ANNOTATION`, `GROUP_ANNOTATION`, and `EMAIL_ANNOTATION` values.
- Confirm `CLUSTER_NAME` is set correctly, because the injector emits `namespace:cluster` pairs and the hub filters on that exact tuple.

## Badge URLs Return 404 or Do Not Render Publicly

### `BADGE_BASE_URL` misconfiguration

- Without `BADGE_BASE_URL`, the API returns a relative path such as `/api/badges/<token>/status.svg`.
- In spoke or protected frontend deployments, external badge consumers should use the hub API route instead. Set `BADGE_BASE_URL` to that public API base.

### oauth-proxy blocks the route

- Badge SVGs are served by `GET /api/badges/{token}/status.svg` and are intentionally public in the backend.
- If you expose only the frontend route, oauth-proxy may still guard that route even though the backend endpoint itself is unauthenticated.

## CVEs Do Not Appear for a User

Start with scope and thresholds.

### Threshold filtering

- Non-`sec_team` users use `global_settings.min_cvss_score` and `global_settings.min_epss_score`.
- Filtering is conjunctive: a CVE must meet both thresholds unless it is manually prioritized or has an active risk acceptance.
- Wildcard all-namespace users still use these thresholds.

### Namespace scoping

- Team members only see CVEs in namespaces supplied through `X-Forwarded-Namespaces`.
- If the spoke sends no namespaces, list endpoints return empty data for non-wildcard users.

### Missing annotations

- If a namespace is missing the required annotation, the auth-header-injector will never include it in the forwarded scope.

## Alembic Migration Errors

Alembic uses the same effective app DB URL logic as the runtime backend.

### Checks

- `APP_DB_URL` is optional. If it is empty, Alembic builds the DSN from `APP_DB_HOST`, `APP_DB_PORT`, `APP_DB_USER`, `APP_DB_PASSWORD`, and `APP_DB_NAME`.
- If you set both `APP_DB_URL` and split fields, `APP_DB_URL` wins.
- StackRox DB settings are irrelevant for Alembic. Migration failures usually mean the app DB configuration is wrong, not the StackRox configuration.

!!! tip
    When troubleshooting migrations, test the app DB settings first. The Alembic environment file reads `settings.effective_app_db_url`, not the StackRox connection settings.
