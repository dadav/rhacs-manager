import json
import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)


class RhacsManagerClient:
    """HTTP client that forwards requests to the RHACS Manager backend API."""

    def __init__(self, base_url: str = settings.backend_url) -> None:
        self.base_url = base_url.rstrip("/")

    def _headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    async def _get(self, path: str, token: str, params: dict | None = None) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.get(path, headers=self._headers(token), params=params)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

    async def _post(self, path: str, token: str, data: dict) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.post(path, headers=self._headers(token), json=data)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

    async def _patch(self, path: str, token: str, data: dict) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.patch(path, headers=self._headers(token), json=data)
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)

    # -- Read-only endpoints --

    async def get_dashboard(self, token: str) -> str:
        return await self._get("/api/dashboard", token)

    async def search_cves(
        self,
        token: str,
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
        return await self._get("/api/cves", token, params)

    async def get_cve(self, token: str, cve_id: str) -> str:
        return await self._get(f"/api/cves/{cve_id}", token)

    async def get_cve_deployments(self, token: str, cve_id: str) -> str:
        return await self._get(f"/api/cves/{cve_id}/deployments", token)

    async def list_risk_acceptances(
        self,
        token: str,
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
        return await self._get("/api/risk-acceptances", token, params)

    async def list_remediations(
        self,
        token: str,
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
        return await self._get("/api/remediations", token, params)

    async def get_me(self, token: str) -> str:
        return await self._get("/api/auth/me", token)

    # -- Write endpoints --

    async def create_risk_acceptance(self, token: str, data: dict) -> str:
        return await self._post("/api/risk-acceptances", token, data)

    async def create_remediation(self, token: str, data: dict) -> str:
        return await self._post("/api/remediations", token, data)

    async def update_remediation(self, token: str, remediation_id: str, data: dict) -> str:
        return await self._patch(f"/api/remediations/{remediation_id}", token, data)
