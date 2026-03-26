"""RHACS Manager MCP Server.

Exposes RHACS Manager CVE management capabilities as MCP tools for
OpenShift Lightspeed. Runs behind oauth-proxy + auth-header-injector,
which inject X-Forwarded-* headers with the user's identity and
namespace scope. These headers are forwarded to the backend API.

Run: uv run python -m mcp_server.server
"""

import logging

from mcp.server.fastmcp import Context, FastMCP

from .api_client import AuthContext, RhacsManagerClient
from .config import settings

logging.basicConfig(level=logging.INFO)
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
    return AuthContext(
        forwarded_user=user,
        forwarded_groups=headers.get("x-forwarded-groups", ""),
        forwarded_namespaces=headers.get("x-forwarded-namespaces", ""),
        forwarded_namespace_emails=headers.get("x-forwarded-namespace-emails", ""),
    )


# ---------------------------------------------------------------------------
# Read-only tools (always registered)
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_security_overview(ctx: Context) -> str:
    """Get the security dashboard summary.

    Returns severity distribution, fixability trends, MTTR, top EPSS CVEs,
    cluster heatmap, and upcoming escalations.
    """
    auth = _extract_auth(ctx)
    return await client.get_dashboard(auth)


@mcp.tool()
async def search_cves(
    ctx: Context,
    search: str | None = None,
    severity: str | None = None,
    fixable: bool | None = None,
    namespace: str | None = None,
    cluster: str | None = None,
    component: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """Search and filter CVEs across visible namespaces.

    Args:
        search: Free-text search (CVE ID, component name, etc.)
        severity: Filter by severity level (critical, important, moderate, low)
        fixable: Filter by fixability (true = only fixable CVEs)
        namespace: Filter by namespace name
        cluster: Filter by cluster name
        component: Filter by affected component name
        page: Page number (default 1)
        page_size: Results per page (default 20, max 200)
    """
    auth = _extract_auth(ctx)
    return await client.search_cves(
        auth,
        search=search,
        severity=severity,
        fixable=fixable,
        namespace=namespace,
        cluster=cluster,
        component=component,
        page=page,
        page_size=page_size,
    )


@mcp.tool()
async def get_cve_detail(ctx: Context, cve_id: str) -> str:
    """Get full details for a specific CVE.

    Returns CVSS/EPSS scores, affected components and images, timeline,
    Red Hat and NVD links, and risk acceptance status.

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    auth = _extract_auth(ctx)
    return await client.get_cve(auth, cve_id)


@mcp.tool()
async def get_cve_affected_deployments(ctx: Context, cve_id: str) -> str:
    """List all deployments affected by a specific CVE.

    Useful for understanding the blast radius and planning remediation.

    Args:
        cve_id: The CVE identifier (e.g. CVE-2024-1234)
    """
    auth = _extract_auth(ctx)
    return await client.get_cve_deployments(auth, cve_id)


@mcp.tool()
async def list_risk_acceptances(
    ctx: Context,
    status: str | None = None,
    cve_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """List risk acceptances, optionally filtered by status or CVE.

    Args:
        status: Filter by status (pending, approved, rejected, expired)
        cve_id: Filter by CVE identifier
        page: Page number (default 1)
        page_size: Results per page (default 20)
    """
    auth = _extract_auth(ctx)
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
    status: str | None = None,
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
    return await client.list_remediations(
        auth,
        status=status,
        cve_id=cve_id,
        namespace=namespace,
        page=page,
        page_size=page_size,
    )


@mcp.tool()
async def get_my_info(ctx: Context) -> str:
    """Get the current user's identity, role, and visible namespaces.

    Returns username, email, role (sec_team or team_member), and the list
    of namespace:cluster pairs the user has access to.
    """
    auth = _extract_auth(ctx)
    return await client.get_me(auth)


# ---------------------------------------------------------------------------
# Write tools (only registered when not in readonly mode)
# ---------------------------------------------------------------------------


def _register_write_tools() -> None:
    @mcp.tool()
    async def create_risk_acceptance(
        ctx: Context,
        cve_id: str,
        justification: str,
        scope_mode: str = "namespace",
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
        return await client.create_remediation(auth, data)

    @mcp.tool()
    async def update_remediation_status(
        ctx: Context,
        remediation_id: str,
        status: str,
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
        return await client.update_remediation(auth, remediation_id, data)


if not settings.readonly:
    _register_write_tools()


def main() -> None:
    mode = "readonly" if settings.readonly else "read-write"
    logger.info("Starting RHACS Manager MCP Server (%s mode) on port %d", mode, settings.port)
    logger.info("Backend URL: %s", settings.backend_url)
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
