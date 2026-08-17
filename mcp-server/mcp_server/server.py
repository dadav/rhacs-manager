"""RHACS Manager MCP Server.

Exposes RHACS Manager CVE management capabilities as MCP tools for
OpenShift Lightspeed. Runs behind oauth-proxy + auth-header-injector,
which inject X-Forwarded-* headers with the user's identity and
namespace scope. These headers are forwarded to the backend API.

Run: uv run python -m mcp_server.server
"""

import logging
from typing import Literal

from mcp.server.fastmcp import Context, FastMCP
from mcp.server.fastmcp.prompts import base
from pydantic import BaseModel

from .api_client import AuthContext, RhacsManagerClient
from .config import settings

Severity = Literal["critical", "important", "moderate", "low"]
RiskAcceptanceStatus = Literal["requested", "approved", "rejected", "expired"]
# "verified" exists only on legacy records: valid as a list filter, rejected as an update target.
RemediationStatusFilter = Literal["open", "in_progress", "resolved", "verified", "wont_fix"]
RemediationStatusSettable = Literal["open", "in_progress", "resolved", "wont_fix"]
RiskScopeMode = Literal["all", "namespace", "image", "deployment"]


class ScopeTarget(BaseModel):
    """One (cluster, namespace) target, optionally narrowed to an image or deployment."""

    cluster_name: str
    namespace: str
    image_name: str | None = None
    deployment_id: str | None = None


def _serialize_targets(targets: list["ScopeTarget | dict"] | None) -> list[dict]:
    """Normalize targets to plain dicts. Accepts model instances (FastMCP-validated
    calls) and raw dicts (direct .fn invocation in tests)."""
    return [ScopeTarget.model_validate(t).model_dump(exclude_none=True) for t in targets or []]


_log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
logging.basicConfig(level=_log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# stateless_http is required: the sidecar runs behind a multi-replica frontend
# Service with no session affinity, so no instance may hold in-memory sessions.
mcp = FastMCP("rhacs-manager", host="0.0.0.0", port=settings.port, stateless_http=True)
client = RhacsManagerClient()


def _extract_auth(ctx: Context) -> AuthContext:
    """Build an AuthContext from the forwarded headers injected by auth-header-injector.

    The oauth-proxy + auth-header-injector sidecar chain resolves the user's
    identity and namespace scope, injecting X-Forwarded-* headers into the request.
    """
    request = ctx.request_context.request
    if not request or not hasattr(request, "headers"):
        raise ValueError(
            "No request context available. The MCP server must be deployed behind oauth-proxy + auth-header-injector."
        )

    headers = request.headers
    user = headers.get("x-forwarded-user", "")
    if not user:
        raise ValueError(
            "No X-Forwarded-User header found. "
            "The MCP server must be deployed behind oauth-proxy + auth-header-injector."
        )
    auth = AuthContext(
        forwarded_user=user,
        forwarded_full_name=headers.get("x-forwarded-full-name", ""),
        forwarded_groups=headers.get("x-forwarded-groups", ""),
        forwarded_namespaces=headers.get("x-forwarded-namespaces", ""),
        forwarded_namespace_emails=headers.get("x-forwarded-namespace-emails", ""),
    )
    logger.debug(
        "Auth context: user=%s, groups=%s, namespaces=%s",
        auth.forwarded_user,
        auth.forwarded_groups,
        auth.forwarded_namespaces,
    )
    return auth


# ---------------------------------------------------------------------------
# Read-only tools (always registered)
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_security_overview(ctx: Context) -> str:
    """Get the security dashboard summary.

    Returns headline counts (``stat_*``), severity distribution, top priority and
    high-EPSS CVEs, CVEs per namespace, fixability breakdown, aging buckets,
    risk-acceptance pipeline counts, and the configured
    ``fix_overdue_threshold_days``. Chart-only series (CVE trend, EPSS scatter,
    cluster heatmap, fixability trend, MTTR breakdown) are omitted to keep the
    payload compact — fetch them via the UI if needed.

    When advising what to fix first, use the product's EPSS-driven ordering: the
    ranked ``fix_first_cves`` list here and ``impact_score`` on CVE items. Do not
    rank by raw CVSS alone — EPSS (probability of exploitation in the next 30 days)
    is the product's core prioritization signal.
    """
    auth = _extract_auth(ctx)
    logger.debug("get_security_overview called by user=%s", auth.forwarded_user)
    return await client.get_dashboard(auth)


@mcp.tool()
async def search_cves(
    ctx: Context,
    search: str | None = None,
    severity: Severity | None = None,
    fixable: bool | None = None,
    namespace: str | None = None,
    cluster: str | None = None,
    component: str | None = None,
    deployment: str | None = None,
    cvss_min: float | None = None,
    epss_min: float | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    prioritized_only: bool = False,
    risk_status: RiskAcceptanceStatus | None = None,
    remediation_status: RemediationStatusFilter | None = None,
    fix_overdue: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search and filter CVEs across visible namespaces.

    Returned items include the 4.10 field ``fix_available_since`` (timestamp the fix
    first appeared in StackRox), in addition to ``first_seen``, ``published_on``,
    severity, CVSS, EPSS, fixability, priority, and risk-acceptance status.

    When advising what to fix first, rank by ``impact_score`` (EPSS-driven), not by
    raw CVSS alone — EPSS (probability of exploitation in the next 30 days) is the
    product's core prioritization signal.

    Args:
        search: Free-text search (CVE ID, component name, etc.)
        severity: Filter by severity level (critical, important, moderate, low)
        fixable: Filter by fixability (true = only fixable CVEs)
        namespace: Filter by namespace name
        cluster: Filter by cluster name
        component: Filter by affected component name
        deployment: Filter by deployment name
        cvss_min: Minimum CVSS score (0-10)
        epss_min: Minimum EPSS probability (0-1)
        age_min: Minimum age in days since first_seen
        age_max: Maximum age in days since first_seen
        prioritized_only: If true, only CVEs with a manual priority set
        risk_status: Filter by risk-acceptance status (e.g. requested, approved, rejected)
        remediation_status: Filter by remediation status (open, in_progress, resolved, verified, wont_fix)
        fix_overdue: If true, only CVEs whose fix has been available longer than the
            configured ``fix_overdue_threshold_days`` (RHACS 4.10).
        page: Page number (default 1)
        page_size: Results per page (default 20, max 200)
    """
    auth = _extract_auth(ctx)
    logger.debug(
        "search_cves called: search=%s severity=%s fixable=%s ns=%s cluster=%s component=%s "
        "deployment=%s cvss_min=%s epss_min=%s age=%s..%s prioritized_only=%s risk_status=%s "
        "remediation_status=%s fix_overdue=%s page=%d",
        search,
        severity,
        fixable,
        namespace,
        cluster,
        component,
        deployment,
        cvss_min,
        epss_min,
        age_min,
        age_max,
        prioritized_only,
        risk_status,
        remediation_status,
        fix_overdue,
        page,
    )
    return await client.search_cves(
        auth,
        search=search,
        severity=severity,
        fixable=fixable,
        namespace=namespace,
        cluster=cluster,
        component=component,
        deployment=deployment,
        cvss_min=cvss_min,
        epss_min=epss_min,
        age_min=age_min,
        age_max=age_max,
        prioritized_only=prioritized_only,
        risk_status=risk_status,
        remediation_status=remediation_status,
        fix_overdue=fix_overdue,
        page=page,
        page_size=page_size,
    )


@mcp.tool()
async def get_cves_by_image(
    ctx: Context,
    cluster: str | None = None,
    namespace: str | None = None,
    search: str | None = None,
    severity: Severity | None = None,
    fixable: bool | None = None,
    cvss_min: float | None = None,
    component: str | None = None,
    image_name: str | None = None,
) -> str:
    """List container images grouped by their CVE burden.

    Returns one entry per image with totals (``total_cves``, ``critical_cves``,
    ``high_cves``, ``medium_cves``, ``low_cves``, ``fixable_cves``,
    ``affected_deployments``, ``max_cvss``, ``max_epss``) and the namespaces and
    clusters it runs in. Use this for "which images carry the worst CVE burden?"
    style triage — the backend already does the per-image aggregation.

    Args:
        cluster: Optional cluster filter
        namespace: Optional namespace filter
        search: Free-text search (matches CVE id or component)
        severity: Restrict to images that have a CVE at this severity (critical,
            important, moderate, low)
        fixable: If true, count only fixable CVEs
        cvss_min: Restrict to CVEs at or above this CVSS score (0-10)
        component: Filter by affected component name
        image_name: Filter by image name substring
    """
    auth = _extract_auth(ctx)
    logger.debug(
        "get_cves_by_image called: cluster=%s namespace=%s severity=%s fixable=%s image=%s",
        cluster,
        namespace,
        severity,
        fixable,
        image_name,
    )
    return await client.get_cves_by_image(
        auth,
        cluster=cluster,
        namespace=namespace,
        search=search,
        severity=severity,
        fixable=fixable,
        cvss_min=cvss_min,
        component=component,
        image_name=image_name,
    )


@mcp.tool()
async def get_cve_detail(ctx: Context, cve_id: str) -> str:
    """Get full details for a specific CVE.

    Returns CVSS/EPSS scores, affected components, the full list of affected
    deployments (``affected_deployments_list`` with per-deployment risk-acceptance,
    remediation, and suppression flags — this IS the blast radius; there is no
    separate deployments tool), timeline, Red Hat and NVD links, and risk
    acceptance status. Includes the RHACS 4.10 fields ``fix_available_since``
    (when a fix first appeared) and, for sec-team callers,
    ``first_system_occurrence`` (earliest org-wide occurrence).

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    auth = _extract_auth(ctx)
    logger.debug("get_cve_detail called: cve_id=%s", cve_id)
    return await client.get_cve(auth, cve_id)


@mcp.tool()
async def list_risk_acceptances(
    ctx: Context,
    status: RiskAcceptanceStatus | None = None,
    cve_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """List risk acceptances, optionally filtered by status or CVE.

    Args:
        status: Filter by status (requested, approved, rejected, expired)
        cve_id: Filter by CVE identifier
        page: Page number (default 1)
        page_size: Results per page (default 20)
    """
    auth = _extract_auth(ctx)
    logger.debug("list_risk_acceptances called: status=%s, cve_id=%s, page=%d", status, cve_id, page)
    return await client.list_risk_acceptances(
        auth,
        status=status,
        cve_id=cve_id,
        page=page,
        page_size=page_size,
    )


@mcp.tool()
async def list_remediations(
    ctx: Context,
    status: RemediationStatusFilter | None = None,
    cve_id: str | None = None,
    namespace: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """List remediation tracking records.

    Args:
        status: Filter by status (open, in_progress, resolved, verified, wont_fix)
        cve_id: Filter by CVE identifier
        namespace: Filter by namespace
        page: Page number (default 1)
        page_size: Results per page (default 20)
    """
    auth = _extract_auth(ctx)
    logger.debug(
        "list_remediations called: status=%s, cve_id=%s, namespace=%s, page=%d", status, cve_id, namespace, page
    )
    return await client.list_remediations(
        auth,
        status=status,
        cve_id=cve_id,
        namespace=namespace,
        page=page,
        page_size=page_size,
    )


@mcp.tool()
async def get_image_layers(
    ctx: Context,
    image_id: str,
    cluster: str | None = None,
    namespace: str | None = None,
) -> str:
    """Get Containerfile (Dockerfile) layer instructions for a container image.

    Returns the image's build layers showing each Dockerfile instruction
    (FROM, RUN, COPY, etc.), along with image metadata (OS, registry, tag,
    scan time) and CVE summary. Use this after get_cve_detail (whose
    ``affected_deployments_list`` carries the image IDs) to inspect how a
    vulnerable image was built and identify which layer introduced a vulnerable
    component.

    Args:
        image_id: The StackRox image ID (SHA from CVE detail or deployment data)
        cluster: Optional cluster filter for namespace-scoped CVE visibility
        namespace: Optional namespace filter for namespace-scoped CVE visibility
    """
    auth = _extract_auth(ctx)
    logger.debug("get_image_layers called: image_id=%s, cluster=%s, namespace=%s", image_id, cluster, namespace)
    return await client.get_image_detail(auth, image_id, cluster=cluster, namespace=namespace)


@mcp.tool()
async def get_my_info(ctx: Context) -> str:
    """Get the current user's identity, role, and visible namespaces.

    Returns username, email, role (sec_team or team_member), and the list
    of namespace:cluster pairs the user has access to.
    """
    auth = _extract_auth(ctx)
    logger.debug("get_my_info called by user=%s", auth.forwarded_user)
    return await client.get_me(auth)


@mcp.tool()
async def get_escalations(
    ctx: Context,
    upcoming: bool = False,
    cluster: str | None = None,
    namespace: str | None = None,
) -> str:
    """List escalations for visible CVEs — already triggered or approaching.

    With ``upcoming=false`` (default): escalations that have already triggered.
    Each entry includes the CVE, namespace/cluster, escalation level (1-3),
    when it triggered, and whether the notification was sent.

    With ``upcoming=true``: CVEs approaching escalation deadlines based on the
    configured rules. Rules can be anchored on ``first_seen`` or, for RHACS 4.10,
    on ``fix_available_since`` (``days_to_levelN_after_fix_available``). Use this
    to answer "what is about to escalate / what deadlines am I facing?".

    Args:
        upcoming: false = already triggered (default), true = approaching deadlines
        cluster: Optional cluster filter
        namespace: Optional namespace filter
    """
    auth = _extract_auth(ctx)
    logger.debug("get_escalations called: upcoming=%s cluster=%s namespace=%s", upcoming, cluster, namespace)
    if upcoming:
        return await client.get_upcoming_escalations(auth, cluster=cluster, namespace=namespace)
    return await client.list_escalations(auth, cluster=cluster, namespace=namespace)


@mcp.tool()
async def get_settings(ctx: Context) -> str:
    """Get global RHACS Manager settings.

    For sec-team callers returns the full payload: visibility thresholds
    (``min_cvss_score``, ``min_epss_score``), ``escalation_rules`` (with the
    RHACS 4.10 ``days_to_levelN_after_fix_available`` anchors), the
    ``fix_overdue_threshold_days`` value, digest schedule, and management email.
    For other callers falls back to ``/settings/thresholds`` which exposes only
    ``min_cvss_score`` and ``min_epss_score``.

    Use this to explain why a CVE is not visible: for non-sec-team users a CVE must
    meet BOTH ``min_cvss_score`` AND ``min_epss_score`` to appear, unless it is
    manually prioritized or has an active risk acceptance.
    """
    auth = _extract_auth(ctx)
    logger.debug("get_settings called by user=%s", auth.forwarded_user)
    return await client.get_settings(auth)


# ---------------------------------------------------------------------------
# Prompts — named workflows that seed the conversation with which tools to
# call and in what order. Prompts do not call the backend themselves; the LLM
# drives the actual tool invocations once the prompt is resolved.
# ---------------------------------------------------------------------------


@mcp.prompt(title="Triage namespace")
def triage_namespace(namespace: str, cluster: str = "") -> list[base.Message]:
    """Walk through a triage of one namespace's CVEs.

    Args:
        namespace: The namespace name to triage (e.g. "payments")
        cluster: Optional cluster name. If omitted, all clusters the user can see.
    """
    scope = f"namespace ``{namespace}``"
    if cluster:
        scope += f" in cluster ``{cluster}``"
    cluster_arg = f', cluster="{cluster}"' if cluster else ""
    return [
        base.UserMessage(
            f"Triage CVEs for {scope} using the rhacs-manager tools. Walk through these steps:\n\n"
            f'1. Call ``search_cves(namespace="{namespace}"{cluster_arg}, prioritized_only=true)`` '
            f"to surface CVEs the sec team has explicitly prioritized.\n"
            f'2. Call ``search_cves(namespace="{namespace}"{cluster_arg}, fix_overdue=true)`` '
            f"to find CVEs whose fix has been available longer than the configured threshold.\n"
            f'3. Call ``get_escalations(upcoming=true, namespace="{namespace}"{cluster_arg})`` '
            f"to see which CVEs are about to escalate.\n"
            f'4. Call ``list_remediations(namespace="{namespace}")`` to check what is already being worked on.\n\n'
            f"Then summarise: which CVEs need attention first, which already have a remediation in flight, "
            f"and what the next concrete actions should be."
        )
    ]


@mcp.prompt(title="Investigate CVE")
def investigate_cve(cve_id: str) -> list[base.Message]:
    """Deep-dive on a single CVE: blast radius, image origin, and current handling.

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    return [
        base.UserMessage(
            f"Investigate {cve_id} using the rhacs-manager tools:\n\n"
            f'1. Call ``get_cve_detail(cve_id="{cve_id}")`` for severity, EPSS, fix status, '
            f"``fix_available_since``, the affected deployments (``affected_deployments_list`` "
            f"is the blast radius), and any existing priority or risk acceptance.\n"
            f"2. For the most-affected image, call ``get_image_layers(image_id=...)`` to identify "
            f"which layer introduced the vulnerable component.\n"
            f'3. Call ``list_risk_acceptances(cve_id="{cve_id}")`` and '
            f'``list_remediations(cve_id="{cve_id}")`` to see how this CVE is already being handled.\n\n'
            f"Then summarise: severity context, who is affected, whether a fix exists, "
            f"and recommended next action (start a remediation, request a risk acceptance if the "
            f"risk is real but acceptable, request suppression if it is a false positive, "
            f"escalate, or no-op)."
        )
    ]


@mcp.prompt(title="Weekly security review")
def weekly_security_review() -> list[base.Message]:
    """Produce a weekly security status report across visible scope."""
    return [
        base.UserMessage(
            "Compile a weekly security review using the rhacs-manager tools:\n\n"
            "1. Call ``get_security_overview()`` for headline counts, severity distribution, "
            "fix-overdue total, priority CVEs, and high-EPSS CVEs.\n"
            "2. Call ``get_escalations(upcoming=true)`` to flag CVEs approaching escalation deadlines.\n"
            '3. Call ``list_risk_acceptances(status="requested")`` to surface pending review work.\n'
            '4. Call ``list_remediations(status="in_progress")`` to show remediation work in flight.\n\n'
            "Then produce a short report with: top 5 CVEs needing attention this week, "
            "any escalations due in the next few days, and the state of the risk-acceptance and "
            "remediation pipelines."
        )
    ]


# ---------------------------------------------------------------------------
# Write tools (only registered when not in readonly mode)
# ---------------------------------------------------------------------------


def _register_write_tools() -> None:
    @mcp.tool()
    async def create_risk_acceptance(
        ctx: Context,
        cve_id: str,
        justification: str,
        scope_mode: RiskScopeMode = "namespace",
        scope_targets: list[ScopeTarget] | None = None,
        expires_at: str | None = None,
    ) -> str:
        """Create a risk acceptance for a CVE.

        A risk acceptance documents that a REAL vulnerability is consciously
        accepted without an immediate fix (e.g. not exploitable in this context,
        compensating controls exist). If the finding is a false positive or does
        not apply at all, use ``request_cve_suppression`` instead.

        Rules the backend enforces:
        - Only team members can create risk acceptances; sec-team users get 403.
        - ``justification`` must be at least 10 characters.
        - ``scope_targets`` must match deployments actually affected by the CVE in
          the caller's visible namespaces — take ``affected_deployments_list`` from
          ``get_cve_detail`` to build valid targets.
        - Scopes resolving to a single (cluster, namespace) are auto-approved
          immediately; ``mode=all`` or multi-namespace scopes go to sec-team review
          with status ``requested``.

        Args:
            cve_id: The CVE identifier (e.g. CVE-2024-1234)
            justification: Reason for accepting the risk (min 10 characters)
            scope_mode: Scope of acceptance (all, namespace, image, deployment).
                ``all`` must have no targets; every other mode requires targets.
            scope_targets: Scope targets with cluster_name and namespace, plus
                image_name (mode=image) or deployment_id (mode=deployment)
            expires_at: Optional expiration date in ISO format (YYYY-MM-DD)
        """
        auth = _extract_auth(ctx)
        data: dict = {
            "cve_id": cve_id,
            "justification": justification,
            "scope": {
                "mode": scope_mode,
                "targets": _serialize_targets(scope_targets),
            },
        }
        if expires_at is not None:
            data["expires_at"] = expires_at
        logger.debug("create_risk_acceptance called: cve_id=%s, scope_mode=%s", cve_id, scope_mode)
        return await client.create_risk_acceptance(auth, data)

    @mcp.tool()
    async def create_remediation(
        ctx: Context,
        cve_id: str,
        namespace: str,
        cluster_name: str,
        assigned_to: str | None = None,
        target_date: str | None = None,
        notes: str | None = None,
    ) -> str:
        """Start tracking remediation for a CVE in a namespace/cluster.

        Creates a remediation record with initial status 'open'. Each
        (cve_id, namespace, cluster) combination can have at most one remediation.

        Args:
            cve_id: The CVE identifier (e.g. CVE-2024-1234)
            namespace: Target namespace
            cluster_name: Target cluster name
            assigned_to: Optional user ID (not a name) to assign the remediation to;
                use the ``id`` from ``get_my_info`` to self-assign
            target_date: Optional target date in ISO format (YYYY-MM-DD)
            notes: Optional notes about the remediation plan
        """
        auth = _extract_auth(ctx)
        data: dict = {
            "cve_id": cve_id,
            "namespace": namespace,
            "cluster_name": cluster_name,
        }
        if assigned_to is not None:
            data["assigned_to"] = assigned_to
        if target_date is not None:
            data["target_date"] = target_date
        if notes is not None:
            data["notes"] = notes
        logger.debug("create_remediation called: cve_id=%s, namespace=%s, cluster=%s", cve_id, namespace, cluster_name)
        return await client.create_remediation(auth, data)

    @mcp.tool()
    async def update_remediation_status(
        ctx: Context,
        remediation_id: str,
        status: RemediationStatusSettable,
        reason: str | None = None,
    ) -> str:
        """Update the status of a remediation.

        Valid transitions: open -> in_progress -> resolved. resolved is terminal
        (it can only be reopened to in_progress). Use wont_fix with a reason to close
        without fixing. There is no verification step; the owning team self-resolves.
        ('verified' is retained only for legacy records and cannot be set on new ones.)

        Args:
            remediation_id: The remediation record ID
            status: New status (open, in_progress, resolved, wont_fix)
            reason: Required when setting status to wont_fix
        """
        auth = _extract_auth(ctx)
        data: dict = {"status": status}
        if reason is not None:
            data["wont_fix_reason"] = reason
        logger.debug("update_remediation_status called: id=%s, status=%s", remediation_id, status)
        return await client.update_remediation(auth, remediation_id, data)

    @mcp.tool()
    async def request_cve_suppression(
        ctx: Context,
        cve_id: str,
        reason: str,
        scope_mode: Literal["all", "namespace"] = "namespace",
        scope_targets: list[ScopeTarget] | None = None,
        reference_url: str | None = None,
    ) -> str:
        """Request suppression of a CVE that is a false positive or not applicable.

        Suppression hides the CVE from lists because the FINDING ITSELF is wrong or
        irrelevant (false positive, vulnerable code path not shipped, vendor says
        not affected). If the vulnerability is real but the risk is consciously
        accepted, use ``create_risk_acceptance`` instead.

        Team-member requests create a rule with status ``requested`` that the sec
        team reviews; sec-team callers create it directly approved. ``reason`` must
        be at least 10 characters. ``scope_mode="namespace"`` requires
        ``scope_targets`` (cluster_name + namespace pairs from the CVE's
        ``affected_deployments_list``); ``scope_mode="all"`` suppresses the CVE
        everywhere the caller can see and must have no targets. An active rule for
        the same CVE and scope already existing returns a 409 conflict.

        Args:
            cve_id: The CVE identifier (e.g. CVE-2024-1234)
            reason: Why this CVE does not apply (min 10 characters)
            scope_mode: ``namespace`` (default) or ``all``
            scope_targets: Required for mode ``namespace``: cluster_name + namespace pairs
            reference_url: Optional link supporting the reason (vendor advisory, VEX, ticket)
        """
        auth = _extract_auth(ctx)
        data: dict = {
            "type": "cve",
            "cve_id": cve_id,
            "reason": reason,
            "scope": {
                "mode": scope_mode,
                "targets": _serialize_targets(scope_targets),
            },
        }
        if reference_url is not None:
            data["reference_url"] = reference_url
        logger.debug("request_cve_suppression called: cve_id=%s, scope_mode=%s", cve_id, scope_mode)
        return await client.create_suppression_rule(auth, data)


if not settings.readonly:
    _register_write_tools()


def main() -> None:
    mode = "readonly" if settings.readonly else "read-write"
    logger.info("Starting RHACS Manager MCP Server (%s mode) on port %d", mode, settings.port)
    logger.info("Backend URL: %s", settings.backend_url)
    logger.debug("Log level: %s", settings.log_level)
    logger.debug("CA bundle: %s", settings.ca_bundle)
    logger.debug("SSL verify: %s", settings.ssl_verify)
    logger.debug("API key configured: %s", bool(settings.api_key))
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
