import json
import logging
import ssl
from dataclasses import dataclass
from urllib.parse import quote

import httpx

from .config import settings

logger = logging.getLogger(__name__)


def _describe_ssl(verify: ssl.SSLContext | bool) -> str:
    """Return a human-readable description of the SSL verify setting for logging."""
    if isinstance(verify, ssl.SSLContext):
        return f"SSLContext(ca_bundle={settings.ca_bundle})"
    return str(verify)


class BackendError(Exception):
    """Raised when the rhacs-manager backend returns a non-2xx response.

    Carries the HTTP status, the FastAPI ``detail`` payload (parsed when possible),
    and the request path. The string form is human-readable so that FastMCP relays
    a useful message to the LLM.
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
    "X-Forwarded-Groups",
    "X-Forwarded-Namespaces",
    "X-Forwarded-Namespace-Emails",
)


# Backend SeverityLevel enum values (backend/app/schemas/cve.py).
# The /cves endpoint expects an int; LLMs pass names — translate here.
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

    def to_headers(self) -> dict[str, str]:
        """Build the header dict to forward to the backend API."""
        headers: dict[str, str] = {
            "X-Forwarded-User": self.forwarded_user,
            "X-Forwarded-Full-Name": self.forwarded_full_name,
            "X-Forwarded-Groups": self.forwarded_groups,
            "X-Forwarded-Namespaces": self.forwarded_namespaces,
            "X-Forwarded-Namespace-Emails": self.forwarded_namespace_emails,
        }
        if settings.api_key:
            headers["X-Api-Key"] = settings.api_key
        return headers


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
            resp = await client.request(method, path, headers=auth.to_headers(), params=params, json=data)
        except httpx.ConnectError as exc:
            logger.debug("Connection failed for %s %s: %s", method.upper(), path, exc)
            raise
        logger.debug("HTTP %s %s -> %d", method.upper(), path, resp.status_code)
        if resp.is_error:
            detail = _extract_detail(resp)
            logger.debug("HTTP error %d for %s %s: %s", resp.status_code, method.upper(), path, detail)
            raise BackendError(resp.status_code, detail, f"{method.upper()} {path}")
        return json.dumps(resp.json(), ensure_ascii=False)

    async def _get(self, path: str, auth: AuthContext, params: dict | None = None) -> str:
        return await self._request("GET", path, auth, params=params)

    async def _post(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("POST", path, auth, data=data)

    async def _patch(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("PATCH", path, auth, data=data)

    # -- Read-only endpoints --

    # Dashboard fields that are chart-rendering aids only — they describe
    # plot points, not facts the LLM reasons over. Drop them before returning
    # to keep the response token-efficient.
    _DASHBOARD_CHART_FIELDS = (
        "cve_trend",
        "epss_matrix",
        "cluster_heatmap",
        "fixable_trend",
        "mttr_by_severity",
    )

    async def get_dashboard(self, auth: AuthContext) -> str:
        raw = await self._get("/api/dashboard", auth)
        try:
            data = json.loads(raw)
        except ValueError:
            return raw
        if isinstance(data, dict):
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
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params: dict = {"page": page, "page_size": page_size}
        if search is not None:
            params["search"] = search
        sev = _normalize_severity(severity)
        if sev is not None:
            params["severity"] = sev
        if fixable is not None:
            params["fixable"] = fixable
        if namespace is not None:
            params["namespace"] = namespace
        if cluster is not None:
            params["cluster"] = cluster
        if component is not None:
            params["component"] = component
        if deployment is not None:
            params["deployment"] = deployment
        if cvss_min is not None:
            params["cvss_min"] = cvss_min
        if epss_min is not None:
            params["epss_min"] = epss_min
        if age_min is not None:
            params["age_min"] = age_min
        if age_max is not None:
            params["age_max"] = age_max
        if prioritized_only:
            params["prioritized_only"] = True
        if risk_status is not None:
            params["risk_status"] = risk_status
        if remediation_status is not None:
            params["remediation_status"] = remediation_status
        if fix_overdue:
            params["fix_overdue"] = True
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
        component: str | None = None,
        image_name: str | None = None,
    ) -> str:
        params: dict = {}
        if cluster is not None:
            params["cluster"] = cluster
        if namespace is not None:
            params["namespace"] = namespace
        if search is not None:
            params["search"] = search
        sev = _normalize_severity(severity)
        if sev is not None:
            params["severity"] = sev
        if fixable is not None:
            params["fixable"] = fixable
        if cvss_min is not None:
            params["cvss_min"] = cvss_min
        if component is not None:
            params["component"] = component
        if image_name is not None:
            params["image_name"] = image_name
        return await self._get("/api/cves/by-image", auth, params or None)

    async def get_cve(self, auth: AuthContext, cve_id: str) -> str:
        return await self._get(f"/api/cves/{cve_id}", auth)

    async def list_risk_acceptances(
        self,
        auth: AuthContext,
        *,
        status: str | None = None,
        cve_id: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params: dict = {"page": page, "page_size": page_size}
        if status is not None:
            params["status"] = status
        if cve_id is not None:
            params["cve_id"] = cve_id
        return await self._get("/api/risk-acceptances", auth, params)

    async def list_remediations(
        self,
        auth: AuthContext,
        *,
        status: str | None = None,
        cve_id: str | None = None,
        namespace: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params: dict = {"page": page, "page_size": page_size}
        if status is not None:
            params["status"] = status
        if cve_id is not None:
            params["cve_id"] = cve_id
        if namespace is not None:
            params["namespace"] = namespace
        return await self._get("/api/remediations", auth, params)

    async def get_me(self, auth: AuthContext) -> str:
        return await self._get("/api/auth/me", auth)

    async def get_image_detail(
        self, auth: AuthContext, image_id: str, *, cluster: str | None = None, namespace: str | None = None
    ) -> str:
        params: dict = {}
        if cluster is not None:
            params["cluster"] = cluster
        if namespace is not None:
            params["namespace"] = namespace
        return await self._get(f"/api/images/{quote(image_id, safe='')}", auth, params or None)

    async def list_escalations(
        self, auth: AuthContext, *, cluster: str | None = None, namespace: str | None = None
    ) -> str:
        params: dict = {}
        if cluster is not None:
            params["cluster"] = cluster
        if namespace is not None:
            params["namespace"] = namespace
        return await self._get("/api/escalations", auth, params or None)

    async def get_upcoming_escalations(
        self, auth: AuthContext, *, cluster: str | None = None, namespace: str | None = None
    ) -> str:
        params: dict = {}
        if cluster is not None:
            params["cluster"] = cluster
        if namespace is not None:
            params["namespace"] = namespace
        return await self._get("/api/escalations/upcoming", auth, params or None)

    async def get_settings(self, auth: AuthContext) -> str:
        """Return global settings. Sec-team users get the full payload (escalation rules,
        thresholds, fix-overdue threshold). Other users fall back to the public threshold
        endpoint, which only exposes min_cvss_score and min_epss_score."""
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
        return await self._post("/api/remediations", auth, data)

    async def update_remediation(self, auth: AuthContext, remediation_id: str, data: dict) -> str:
        return await self._patch(f"/api/remediations/{remediation_id}", auth, data)

    async def create_suppression_rule(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/suppression-rules", auth, data)
