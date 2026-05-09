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

from .api_client import AuthContext, RhacsManagerClient
from .config import settings

Severity = Literal["critical", "important", "moderate", "low"]
RiskAcceptanceStatus = Literal["requested", "approved", "rejected", "expired"]
RemediationStatus = Literal["open", "in_progress", "resolved", "verified", "wont_fix"]
RiskScopeMode = Literal["all", "namespace", "image", "deployment"]

_log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
logging.basicConfig(level=_log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

mcp = FastMCP("rhacs-manager", host="0.0.0.0", port=settings.port)
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
    top vulnerable components, risk-acceptance pipeline counts, and the configured
    ``fix_overdue_threshold_days``. Chart-only series (CVE trend, EPSS scatter,
    cluster heatmap, fixability trend, MTTR breakdown) are omitted to keep the
    payload compact — fetch them via the UI if needed.
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
    risk_status: str | None = None,
    remediation_status: str | None = None,
    fix_overdue: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search and filter CVEs across visible namespaces.

    Returned items include the 4.10 field ``fix_available_since`` (timestamp the fix
    first appeared in StackRox), in addition to ``first_seen``, ``published_on``,
    severity, CVSS, EPSS, fixability, priority, and risk-acceptance status.

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

    Returns CVSS/EPSS scores, affected components and images, timeline,
    Red Hat and NVD links, and risk acceptance status. Includes the RHACS 4.10
    fields ``fix_available_since`` (when a fix first appeared) and, for sec-team
    callers, ``first_system_occurrence`` (earliest org-wide occurrence).

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    auth = _extract_auth(ctx)
    logger.debug("get_cve_detail called: cve_id=%s", cve_id)
    return await client.get_cve(auth, cve_id)


@mcp.tool()
async def get_cve_affected_deployments(ctx: Context, cve_id: str) -> str:
    """List all deployments affected by a specific CVE.

    Useful for understanding the blast radius and planning remediation.

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    auth = _extract_auth(ctx)
    logger.debug("get_cve_affected_deployments called: cve_id=%s", cve_id)
    return await client.get_cve_deployments(auth, cve_id)


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
    status: RemediationStatus | None = None,
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
    scan time) and CVE summary. Use this after get_cve_affected_deployments
    to inspect how a vulnerable image was built and identify which layer
    introduced a vulnerable component.

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
async def list_escalations(
    ctx: Context,
    cluster: str | None = None,
    namespace: str | None = None,
) -> str:
    """List escalations that have already been triggered for visible CVEs.

    Each entry includes the CVE, namespace/cluster, escalation level (1-3),
    when it triggered, and whether the notification was sent.

    Args:
        cluster: Optional cluster filter
        namespace: Optional namespace filter
    """
    auth = _extract_auth(ctx)
    logger.debug("list_escalations called: cluster=%s namespace=%s", cluster, namespace)
    return await client.list_escalations(auth, cluster=cluster, namespace=namespace)


@mcp.tool()
async def get_upcoming_escalations(
    ctx: Context,
    cluster: str | None = None,
    namespace: str | None = None,
) -> str:
    """List CVEs approaching escalation deadlines based on configured rules.

    Returns CVEs that match an escalation rule and are within the warning window
    of their next level. Rules can be anchored on ``first_seen`` or, for RHACS 4.10,
    on ``fix_available_since`` (``days_to_levelN_after_fix_available``).

    Args:
        cluster: Optional cluster filter
        namespace: Optional namespace filter
    """
    auth = _extract_auth(ctx)
    logger.debug("get_upcoming_escalations called: cluster=%s namespace=%s", cluster, namespace)
    return await client.get_upcoming_escalations(auth, cluster=cluster, namespace=namespace)


@mcp.tool()
async def get_settings(ctx: Context) -> str:
    """Get global RHACS Manager settings.

    For sec-team callers returns the full payload: visibility thresholds
    (``min_cvss_score``, ``min_epss_score``), ``escalation_rules`` (with the
    RHACS 4.10 ``days_to_levelN_after_fix_available`` anchors), the
    ``fix_overdue_threshold_days`` value, digest schedule, and management email.
    For other callers falls back to ``/settings/thresholds`` which exposes only
    ``min_cvss_score`` and ``min_epss_score``.
    """
    auth = _extract_auth(ctx)
    logger.debug("get_settings called by user=%s", auth.forwarded_user)
    return await client.get_settings(auth)


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
        scope_targets: list[dict] | None = None,
        expires_at: str | None = None,
    ) -> str:
        """Create a risk acceptance for a CVE.

        Risk acceptances document why a CVE is accepted without immediate fix.
        Only team members (not sec team) can create them.

        Args:
            cve_id: The CVE identifier (e.g. CVE-2024-1234)
            justification: Reason for accepting the risk
            scope_mode: Scope of acceptance (all, namespace, image, deployment)
            scope_targets: List of scope targets, each with keys: cluster_name, namespace,
                and optionally image_name or deployment_id
            expires_at: Optional expiration date in ISO format (YYYY-MM-DD)
        """
        auth = _extract_auth(ctx)
        data: dict = {
            "cve_id": cve_id,
            "justification": justification,
            "scope": {
                "mode": scope_mode,
                "targets": scope_targets or [],
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
            assigned_to: Optional user ID to assign the remediation to
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
        status: RemediationStatus,
        reason: str | None = None,
    ) -> str:
        """Update the status of a remediation.

        Valid transitions: open -> in_progress -> resolved -> verified.
        Use wont_fix with a reason to close without fixing.
        Only sec team can set status to 'verified'.

        Args:
            remediation_id: The remediation record ID
            status: New status (open, in_progress, resolved, verified, wont_fix)
            reason: Required when setting status to wont_fix
        """
        auth = _extract_auth(ctx)
        data: dict = {"status": status}
        if reason is not None:
            data["wont_fix_reason"] = reason
        logger.debug("update_remediation_status called: id=%s, status=%s", remediation_id, status)
        return await client.update_remediation(auth, remediation_id, data)


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
