import json
import logging
from dataclasses import dataclass

import httpx

from .config import settings

logger = logging.getLogger(__name__)

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

    async def _get(self, path: str, auth: AuthContext, params: dict | None = None) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.get(path, headers=auth.to_headers(), params=params)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

    async def _post(self, path: str, auth: AuthContext, data: dict) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.post(path, headers=auth.to_headers(), json=data)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

    async def _patch(self, path: str, auth: AuthContext, data: dict) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.patch(path, headers=auth.to_headers(), json=data)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

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

    # -- Write endpoints --

    async def create_risk_acceptance(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/risk-acceptances", auth, data)

    async def create_remediation(self, auth: AuthContext, data: dict) -> str:
        return await self._post("/api/remediations", auth, data)

    async def update_remediation(self, auth: AuthContext, remediation_id: str, data: dict) -> str:
        return await self._patch(f"/api/remediations/{remediation_id}", auth, data)
