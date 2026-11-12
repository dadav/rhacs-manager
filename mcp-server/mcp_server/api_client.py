import json
import logging
import ssl
from dataclasses import dataclass
from urllib.parse import quote

import httpx
from mcp.server.mcpserver.exceptions import ToolError

from .config import settings

logger = logging.getLogger(__name__)


def _describe_ssl(verify: ssl.SSLContext | bool) -> str:
    """Return a human-readable description of the SSL verify setting for logging."""
    if isinstance(verify, ssl.SSLContext):
        return f"SSLContext(ca_bundle={settings.ca_bundle})"
    return str(verify)


class BackendError(ToolError):
    """Raised when the rhacs-manager backend returns a non-2xx response.

    Carries the HTTP status, the FastAPI ``detail`` payload (parsed when possible),
    and the request path. The string form is human-readable so that MCPServer relays
    a useful message to the LLM. Must stay a ToolError subclass: mcp v2 masks the
    text of any other exception raised from a tool.
    """

    def __init__(self, status: int, detail: str, path: str) -> None:
        self.status = status
        self.detail = detail
        self.path = path
        super().__init__(f"{status} {path}: {detail}")


def _extract_detail(resp: httpx.Response) -> str:
    """Pull the most useful error message from a FastAPI error response."""
    try:
        body = resp.json()
    except ValueError:
        text = resp.text.strip()
        return text[:500] if text else (resp.reason_phrase or "unknown error")
    if isinstance(body, dict) and "detail" in body:
        detail = body["detail"]
        if isinstance(detail, str):
            return detail
        return json.dumps(detail, ensure_ascii=False)[:500]
    return json.dumps(body, ensure_ascii=False)[:500]


FORWARDED_HEADER_NAMES = (
    "X-Forwarded-User",
    "X-Forwarded-Full-Name",
    "X-Forwarded-Email",
    "X-Forwarded-Groups",
    "X-Forwarded-Namespaces",
    "X-Forwarded-Namespace-Emails",
    "X-Forwarded-Cluster",
)


# Backend SeverityLevel enum values (backend/app/schemas/cve.py).
# The /cves endpoint expects an int; LLMs pass names; translate here.
_SEVERITY_NAME_TO_INT = {
    "critical": 4,
    "important": 3,
    "moderate": 2,
    "low": 1,
    "unknown": 0,
}


def _normalize_severity(severity: str | int | None) -> int | None:
    if severity is None:
        return None
    if isinstance(severity, int):
        return severity
    return _SEVERITY_NAME_TO_INT.get(severity.lower())


@dataclass(frozen=True, slots=True)
class AuthContext:
    """Auth headers extracted from the incoming request (injected by auth-header-injector)."""

    forwarded_user: str
    forwarded_groups: str
    forwarded_namespaces: str
    forwarded_namespace_emails: str
    forwarded_full_name: str = ""
    forwarded_email: str = ""
    # Origin cluster stamped by auth-header-injector; the backend uses it to add
    # namespaces from peer clusters (CROSS_CLUSTER_ACCESS_SETS).
    forwarded_cluster: str = ""

    def to_headers(self) -> dict[str, str]:
        """Build the header dict to forward to the backend API."""
        headers: dict[str, str] = {
            "X-Forwarded-User": self.forwarded_user,
            "X-Forwarded-Full-Name": self.forwarded_full_name,
            "X-Forwarded-Groups": self.forwarded_groups,
            "X-Forwarded-Namespaces": self.forwarded_namespaces,
            "X-Forwarded-Namespace-Emails": self.forwarded_namespace_emails,
            "X-Forwarded-Cluster": self.forwarded_cluster,
        }
        if self.forwarded_email:
            headers["X-Forwarded-Email"] = self.forwarded_email
        if settings.api_key:
            headers["X-Api-Key"] = settings.api_key
        return headers


def _optional_params(**values) -> dict:
    return {key: value for key, value in values.items() if value is not None}


def _paginate_list(raw_json: str, page: int, page_size: int) -> str:
    if page < 1 or page_size < 1:
        raise ToolError("page and page_size must be at least 1")
    items = json.loads(raw_json)
    if not isinstance(items, list):
        raise ToolError("RHACS Manager backend returned an unexpected list response")
    start = (page - 1) * page_size
    return json.dumps(
        {"items": items[start : start + page_size], "total": len(items), "page": page, "page_size": page_size},
        ensure_ascii=False,
    )


class RhacsManagerClient:
    """HTTP client that forwards requests to the RHACS Manager backend API.

    Holds a single ``httpx.AsyncClient`` for the lifetime of the process, lazily
    initialized on first use (must be created inside a running event loop).
    """

    def __init__(self, base_url: str = settings.backend_url) -> None:
        self.base_url = base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            ssl_verify = settings.ssl_verify
            logger.debug(
                "Creating shared httpx.AsyncClient (base_url=%s, verify=%s)",
                self.base_url,
                _describe_ssl(ssl_verify),
            )
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=30,
                verify=ssl_verify,
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request(
        self, method: str, path: str, auth: AuthContext, params: dict | None = None, data: dict | None = None
    ) -> str:
        logger.debug("HTTP %s %s%s", method.upper(), self.base_url, path)
        if params:
            logger.debug("  params=%s", params)
        if data:
            logger.debug("  body=%s", json.dumps(data, ensure_ascii=False))
        client = self._get_client()
        try:
            resp = await client.request(
                method, path, headers={**auth.to_headers(), "Accept-Language": "en"}, params=params, json=data
            )
        except httpx.TransportError as exc:
            # Connect/DNS/TLS/timeout failures. Log the full cause at WARNING: mcp v2 logs
            # ToolErrors at INFO without the exception chain, so this is the only place
            # the diagnostic survives at the default log level.
            logger.warning(
                "Backend request failed: %s %s%s: %s: %s",
                method.upper(),
                self.base_url,
                path,
                type(exc).__name__,
                exc,
            )
            raise ToolError(
                f"RHACS Manager backend request failed ({type(exc).__name__}); see mcp-server logs"
            ) from exc
        logger.debug("HTTP %s %s -> %d", method.upper(), path, resp.status_code)
        if resp.is_error:
            detail = _extract_detail(resp)
            logger.debug("HTTP error %d for %s %s: %s", resp.status_code, method.upper(), path, detail)
            raise BackendError(resp.status_code, detail, f"{method.upper()} {path}")
        try:
            return json.dumps(resp.json(), ensure_ascii=False)
        except ValueError as exc:
            raise ToolError(f"RHACS Manager backend returned invalid JSON for {method.upper()} {path}") from exc

    async def _get(self, path: str, auth: AuthContext, params: dict | None = None) -> str:
        return await self._request("GET", path, auth, params=params)

    async def _post(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("POST", path, auth, data=data)

    async def _patch(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("PATCH", path, auth, data=data)

    async def _put(self, path: str, auth: AuthContext, data: dict | None = None) -> str:
        return await self._request("PUT", path, auth, data=data)

    async def _delete(self, path: str, auth: AuthContext) -> str:
        return await self._request("DELETE", path, auth)

    # -- Read-only endpoints --

    _DASHBOARD_CHART_FIELDS = (
        "cve_trend",
        "epss_matrix",
        "cluster_heatmap",
        "cve_history",
        "mttr_by_severity",
    )

    async def get_dashboard(
        self,
        auth: AuthContext,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        ignore_thresholds: bool = False,
    ) -> str:
        params = _optional_params(cluster=cluster, namespace=namespace, ignore_thresholds=ignore_thresholds)
        data = json.loads(await self._get("/api/dashboard", auth, params))
        for field in self._DASHBOARD_CHART_FIELDS:
            data.pop(field, None)
        return json.dumps(data, ensure_ascii=False)

    async def search_cves(
        self,
        auth: AuthContext,
        *,
        search: str | None = None,
        severity: str | int | None = None,
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
        origin: str | None = None,
        show_remediated: bool = False,
        show_suppressed: bool = False,
        subscribed_only: bool = False,
        ignore_thresholds: bool = False,
        sort_by: str = "severity",
        sort_desc: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(
            search=search,
            severity=_normalize_severity(severity),
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
            origin=origin,
            show_remediated=show_remediated,
            show_suppressed=show_suppressed,
            subscribed_only=subscribed_only,
            ignore_thresholds=ignore_thresholds,
            sort_by=sort_by,
            sort_desc=sort_desc,
            page=page,
            page_size=page_size,
        )
        return await self._get("/api/cves", auth, params)

    async def get_cves_by_image(
        self,
        auth: AuthContext,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        search: str | None = None,
        severity: str | int | None = None,
        fixable: bool | None = None,
        cvss_min: float | None = None,
        epss_min: float | None = None,
        component: str | None = None,
        image_name: str | None = None,
        origin: str | None = None,
        ignore_thresholds: bool = False,
    ) -> str:
        params = _optional_params(
            cluster=cluster,
            namespace=namespace,
            search=search,
            severity=_normalize_severity(severity),
            fixable=fixable,
            cvss_min=cvss_min,
            epss_min=epss_min,
            component=component,
            image_name=image_name,
            origin=origin,
            ignore_thresholds=ignore_thresholds,
        )
        return await self._get("/api/cves/by-image", auth, params)

    async def get_cve(
        self, auth: AuthContext, cve_id: str, *, cluster: str | None = None, namespace: str | None = None
    ) -> str:
        params = _optional_params(cluster=cluster, namespace=namespace)
        return await self._get(f"/api/cves/{quote(cve_id, safe='')}", auth, params or None)

    async def get_fix_recommendations(
        self,
        auth: AuthContext,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        component: str | None = None,
        severity: str | int | None = None,
        fixable_only: bool = False,
        prioritized_only: bool = False,
        image_id: str | None = None,
        ignore_thresholds: bool = False,
        page: int = 1,
        page_size: int = 10,
    ) -> str:
        params = _optional_params(
            cluster=cluster,
            namespace=namespace,
            component=component,
            severity=_normalize_severity(severity),
            fixable_only=fixable_only,
            prioritized_only=prioritized_only,
            image_id=image_id,
            ignore_thresholds=ignore_thresholds,
            page=page,
            page_size=page_size,
        )
        data = json.loads(await self._get("/api/cves/fixes", auth, params))
        for item in data["items"]:
            for field in ("cves", "images"):
                item[f"{field}_truncated"] = max(0, len(item[field]) - 10)
                item[field] = item[field][:10]
        return json.dumps(data, ensure_ascii=False)

    async def list_risk_acceptances(
        self,
        auth: AuthContext,
        *,
        status: str | None = None,
        cve_id: str | None = None,
        cluster: str | None = None,
        namespace: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(status=status, cve_id=cve_id, cluster=cluster, namespace=namespace)
        raw = await self._get("/api/risk-acceptances", auth, params or None)
        return _paginate_list(raw, page, page_size)

    async def list_remediations(
        self,
        auth: AuthContext,
        *,
        status: str | None = None,
        cve_id: str | None = None,
        namespace: str | None = None,
        cluster: str | None = None,
        overdue: bool | None = None,
        assigned_to: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(
            status=status, cve_id=cve_id, namespace=namespace, cluster=cluster, overdue=overdue, assigned_to=assigned_to
        )
        raw = await self._get("/api/remediations", auth, params or None)
        return _paginate_list(raw, page, page_size)

    async def list_suppression_rules(
        self,
        auth: AuthContext,
        *,
        status: str | None = None,
        type: str | None = None,
        cve_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(status=status, type=type, cve_id=cve_id)
        raw = await self._get("/api/suppression-rules", auth, params or None)
        return _paginate_list(raw, page, page_size)

    async def get_me(self, auth: AuthContext) -> str:
        return await self._get("/api/auth/me", auth)

    async def get_image_detail(
        self,
        auth: AuthContext,
        image_id: str,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        ignore_thresholds: bool = False,
    ) -> str:
        params = _optional_params(cluster=cluster, namespace=namespace, ignore_thresholds=ignore_thresholds)
        return await self._get(f"/api/images/{quote(image_id, safe='')}", auth, params)

    async def list_escalations(
        self,
        auth: AuthContext,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        search: str | None = None,
        level: int | None = None,
        contact_status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(
            cluster=cluster,
            namespace=namespace,
            search=search,
            level=level,
            contact_status=contact_status,
            page=page,
            page_size=page_size,
        )
        return await self._get("/api/escalations/active/search", auth, params)

    async def get_upcoming_escalations(
        self,
        auth: AuthContext,
        *,
        cluster: str | None = None,
        namespace: str | None = None,
        search: str | None = None,
        next_level: int | None = None,
        severity: str | int | None = None,
        days_max: int | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params = _optional_params(
            cluster=cluster,
            namespace=namespace,
            search=search,
            next_level=next_level,
            severity=_normalize_severity(severity),
            days_max=days_max,
            page=page,
            page_size=page_size,
        )
        return await self._get("/api/escalations/upcoming/search", auth, params)

    async def get_settings(self, auth: AuthContext) -> str:
        """Return full settings for sec-team users, public thresholds for other users."""
        try:
            return await self._get("/api/settings", auth)
        except BackendError as exc:
            if exc.status == 403:
                return await self._get("/api/settings/thresholds", auth)
            raise

    # -- Write endpoints --

    async def create_risk_acceptance(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/risk-acceptances", auth, data)

    async def create_remediation(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/remediations/batch", auth, data)

    async def update_remediation(self, auth: AuthContext, remediation_id: str, data: dict) -> str:
        return await self._patch(f"/api/remediations/{quote(remediation_id, safe='')}", auth, data)

    async def set_cve_subscription(self, auth: AuthContext, cve_id: str, subscribed: bool) -> str:
        path = f"/api/cves/{quote(cve_id, safe='')}/subscription"
        if subscribed:
            return await self._put(path, auth)
        return await self._delete(path, auth)

    async def create_suppression_rule(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/suppression-rules", auth, data)
