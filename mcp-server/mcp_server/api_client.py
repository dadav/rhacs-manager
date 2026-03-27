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


FORWARDED_HEADER_NAMES = (
    "X-Forwarded-User",
    "X-Forwarded-Groups",
    "X-Forwarded-Namespaces",
    "X-Forwarded-Namespace-Emails",
)


@dataclass(frozen=True, slots=True)
class AuthContext:
    """Auth headers extracted from the incoming request (injected by auth-header-injector)."""

    forwarded_user: str
    forwarded_groups: str
    forwarded_namespaces: str
    forwarded_namespace_emails: str

    def to_headers(self) -> dict[str, str]:
        """Build the header dict to forward to the backend API."""
        headers: dict[str, str] = {
            "X-Forwarded-User": self.forwarded_user,
            "X-Forwarded-Groups": self.forwarded_groups,
            "X-Forwarded-Namespaces": self.forwarded_namespaces,
            "X-Forwarded-Namespace-Emails": self.forwarded_namespace_emails,
        }
        if settings.api_key:
            headers["X-Api-Key"] = settings.api_key
        return headers


class RhacsManagerClient:
    """HTTP client that forwards requests to the RHACS Manager backend API."""

    def __init__(self, base_url: str = settings.backend_url) -> None:
        self.base_url = base_url.rstrip("/")

    async def _request(
        self, method: str, path: str, auth: AuthContext, params: dict | None = None, data: dict | None = None
    ) -> str:
        ssl_verify = settings.ssl_verify
        logger.debug("HTTP %s %s%s (verify=%s)", method.upper(), self.base_url, path, _describe_ssl(ssl_verify))
        if params:
            logger.debug("  params=%s", params)
        if data:
            logger.debug("  body=%s", json.dumps(data, ensure_ascii=False))
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=30, verify=ssl_verify) as client:
                resp = await client.request(method, path, headers=auth.to_headers(), params=params, json=data)
                logger.debug("HTTP %s %s -> %d", method.upper(), path, resp.status_code)
                resp.raise_for_status()
                return json.dumps(resp.json(), ensure_ascii=False)
        except httpx.ConnectError as exc:
            logger.debug("Connection failed for %s %s: %s", method.upper(), path, exc)
            raise
        except httpx.HTTPStatusError as exc:
            logger.debug(
                "HTTP error %d for %s %s: %s", exc.response.status_code, method.upper(), path, exc.response.text
            )
            raise

    async def _get(self, path: str, auth: AuthContext, params: dict | None = None) -> str:
        return await self._request("GET", path, auth, params=params)

    async def _post(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("POST", path, auth, data=data)

    async def _patch(self, path: str, auth: AuthContext, data: dict) -> str:
        return await self._request("PATCH", path, auth, data=data)

    # -- Read-only endpoints --

    async def get_dashboard(self, auth: AuthContext) -> str:
        return await self._get("/api/dashboard", auth)

    async def search_cves(
        self,
        auth: AuthContext,
        *,
        search: str | None = None,
        severity: str | None = None,
        fixable: bool | None = None,
        namespace: str | None = None,
        cluster: str | None = None,
        component: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> str:
        params: dict = {"page": page, "page_size": page_size}
        if search is not None:
            params["search"] = search
        if severity is not None:
            params["severity"] = severity
        if fixable is not None:
            params["fixable"] = fixable
        if namespace is not None:
            params["namespace"] = namespace
        if cluster is not None:
            params["cluster"] = cluster
        if component is not None:
            params["component"] = component
        return await self._get("/api/cves", auth, params)

    async def get_cve(self, auth: AuthContext, cve_id: str) -> str:
        return await self._get(f"/api/cves/{cve_id}", auth)

    async def get_cve_deployments(self, auth: AuthContext, cve_id: str) -> str:
        return await self._get(f"/api/cves/{cve_id}/deployments", auth)

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

    # -- Write endpoints --

    async def create_risk_acceptance(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/risk-acceptances", auth, data)

    async def create_remediation(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/remediations", auth, data)

    async def update_remediation(self, auth: AuthContext, remediation_id: str, data: dict) -> str:
        return await self._patch(f"/api/remediations/{remediation_id}", auth, data)
