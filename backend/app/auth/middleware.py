import logging
import secrets
import time

import httpx
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import AppSessionLocal
from ..models.namespace_contact import NamespaceContact
from ..models.user import User, UserRole

logger = logging.getLogger(__name__)


# OIDC JWKS cache: {"keys": [...], "fetched_at": float}
_jwks_cache: dict[str, object] = {}
_JWKS_CACHE_TTL = 3600  # 1 hour


def _parse_namespaces_header(raw: str) -> list[tuple[str, str]]:
    """Parse 'ns1:cluster1,ns2:cluster2' into [(ns, cluster), ...]."""
    if not raw.strip():
        return []
    pairs = []
    for entry in raw.split(","):
        entry = entry.strip()
        if ":" not in entry:
            continue
        ns, cluster = entry.split(":", 1)
        ns, cluster = ns.strip(), cluster.strip()
        if ns and cluster:
            pairs.append((ns, cluster))
    if len(pairs) > settings.max_namespace_count:
        raise HTTPException(
            status_code=400,
            detail=f"Zu viele Namespaces ({len(pairs)} > {settings.max_namespace_count})",
        )
    return pairs


def _parse_namespace_emails_header(raw: str) -> list[tuple[str, str, str]]:
    """Parse 'ns1:cluster1=email@x.com,ns2:cluster2=email@y.com' into [(ns, cluster, email), ...]."""
    if not raw.strip():
        return []
    result = []
    for entry in raw.split(","):
        entry = entry.strip()
        if "=" not in entry:
            continue
        ns_cluster, email = entry.rsplit("=", 1)
        email = email.strip()
        if ":" not in ns_cluster or not email:
            continue
        ns, cluster = ns_cluster.split(":", 1)
        ns, cluster = ns.strip(), cluster.strip()
        if ns and cluster:
            result.append((ns, cluster, email))
    return result


async def _upsert_namespace_contacts(
    session: AsyncSession, contacts: list[tuple[str, str, str]]
) -> None:
    """Upsert namespace escalation email contacts. Only writes if data changed."""
    if not contacts:
        return
    for ns, cluster, email in contacts:
        result = await session.execute(
            select(NamespaceContact).where(
                NamespaceContact.namespace == ns,
                NamespaceContact.cluster_name == cluster,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            if existing.escalation_email != email:
                existing.escalation_email = email
        else:
            session.add(
                NamespaceContact(
                    namespace=ns,
                    cluster_name=cluster,
                    escalation_email=email,
                )
            )
    await session.commit()


class CurrentUser:
    def __init__(
        self,
        id: str,
        username: str,
        email: str,
        role: UserRole,
        namespaces: list[tuple[str, str]],
        onboarding_completed: bool = False,
        has_all_namespaces: bool = False,
    ):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.namespaces = namespaces
        self.onboarding_completed = onboarding_completed
        self.has_all_namespaces = has_all_namespaces

    @property
    def is_sec_team(self) -> bool:
        return self.role == UserRole.sec_team

    @property
    def can_see_all_namespaces(self) -> bool:
        return self.is_sec_team or self.has_all_namespaces

    @property
    def has_namespaces(self) -> bool:
        return len(self.namespaces) > 0 or self.has_all_namespaces


async def _get_or_create_user(session: AsyncSession, user_data: dict) -> User:
    result = await session.execute(select(User).where(User.id == user_data["id"]))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=user_data["id"],
            username=user_data["username"],
            email=user_data["email"],
            role=UserRole(user_data["role"]),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.info("Auto-created user %s", user.id)
    return user


async def _sync_user_fields(session: AsyncSession, user: User, user_data: dict) -> User:
    """Update user fields if they differ from provided data."""
    updated = False
    if user.username != user_data["username"]:
        user.username = user_data["username"]
        updated = True
    if user.email != user_data["email"]:
        user.email = user_data["email"]
        updated = True
    desired_role = UserRole(user_data["role"])
    if user.role != desired_role:
        user.role = desired_role
        updated = True
    if updated:
        await session.commit()
        await session.refresh(user)
    return user


def _to_current_user(
    user: User, namespaces: list[tuple[str, str]], has_all_namespaces: bool = False
) -> CurrentUser:
    return CurrentUser(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        namespaces=namespaces,
        onboarding_completed=user.onboarding_completed,
        has_all_namespaces=has_all_namespaces,
    )


async def _handle_dev_mode(session: AsyncSession) -> CurrentUser:
    has_all_namespaces = settings.dev_user_namespaces.strip() == "*"
    namespaces = (
        []
        if has_all_namespaces
        else _parse_namespaces_header(settings.dev_user_namespaces)
    )

    # Upsert dev namespace email contacts
    ns_emails = _parse_namespace_emails_header(settings.dev_namespace_emails)
    if ns_emails:
        await _upsert_namespace_contacts(session, ns_emails)

    user_data = {
        "id": settings.dev_user_id,
        "username": settings.dev_user_name,
        "email": settings.dev_user_email,
        "role": settings.dev_user_role,
    }
    user = await _get_or_create_user(session, user_data)
    user = await _sync_user_fields(session, user, user_data)
    return _to_current_user(user, namespaces, has_all_namespaces=has_all_namespaces)


async def _handle_spoke_proxy(session: AsyncSession, request: Request) -> CurrentUser:
    """Authenticate requests from spoke proxy via X-Api-Key + X-Forwarded-* headers."""
    forwarded_user = request.headers.get("X-Forwarded-User", "")
    forwarded_email = request.headers.get("X-Forwarded-Email", "")
    forwarded_groups_raw = request.headers.get("X-Forwarded-Groups", "")
    forwarded_namespaces_raw = request.headers.get("X-Forwarded-Namespaces", "")

    if not forwarded_user:
        raise HTTPException(status_code=401, detail="X-Forwarded-User header fehlt")

    groups = [g.strip() for g in forwarded_groups_raw.split(",") if g.strip()]
    has_all_namespaces = forwarded_namespaces_raw.strip() == "*"
    namespaces = (
        [] if has_all_namespaces else _parse_namespaces_header(forwarded_namespaces_raw)
    )

    # Determine role from groups
    role = (
        UserRole.sec_team if settings.sec_team_group in groups else UserRole.team_member
    )

    # Use spoke:<username> as user ID to avoid collisions across clusters
    user_id = f"spoke:{forwarded_user}"

    user_data = {
        "id": user_id,
        "username": forwarded_user,
        "email": forwarded_email or f"{forwarded_user}@spoke.local",
        "role": role.value,
    }
    user = await _get_or_create_user(session, user_data)
    user = await _sync_user_fields(session, user, user_data)

    # Upsert namespace escalation email contacts from header
    ns_emails_raw = request.headers.get("X-Forwarded-Namespace-Emails", "")
    ns_emails = _parse_namespace_emails_header(ns_emails_raw)
    if ns_emails:
        await _upsert_namespace_contacts(session, ns_emails)

    logger.info(
        "Spoke proxy auth: user=%s, role=%s, namespaces=%d, all_ns=%s",
        user_id,
        role.value,
        len(namespaces),
        has_all_namespaces,
    )
    return _to_current_user(user, namespaces, has_all_namespaces=has_all_namespaces)


async def _get_oidc_signing_key(token: str) -> object:
    """Fetch OIDC JWKS and return the RSA public key matching the token's kid header."""
    from jose import jwt as jose_jwt

    # Decode header to get kid
    header = jose_jwt.get_unverified_header(token)
    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token hat kein kid im Header")

    # Check cache
    now = time.monotonic()
    cached_keys = _jwks_cache.get("keys")
    cached_at = _jwks_cache.get("fetched_at", 0.0)
    if cached_keys and (now - cached_at) < _JWKS_CACHE_TTL:
        for key in cached_keys:
            if key.get("kid") == kid:
                return key
        # kid not found in cache — refetch in case keys rotated
        logger.info("OIDC kid %s not in cached JWKS, refetching", kid)

    # Fetch OIDC discovery document
    discovery_url = (
        f"{settings.oidc_issuer.rstrip('/')}/.well-known/openid-configuration"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        disco_resp = await client.get(discovery_url)
        disco_resp.raise_for_status()
        jwks_uri = disco_resp.json()["jwks_uri"]

        jwks_resp = await client.get(jwks_uri)
        jwks_resp.raise_for_status()
        jwks = jwks_resp.json()

    # Cache the keys
    _jwks_cache["keys"] = jwks.get("keys", [])
    _jwks_cache["fetched_at"] = now

    for key in _jwks_cache["keys"]:
        if key.get("kid") == kid:
            return key

    raise HTTPException(
        status_code=401, detail="Kein passender OIDC-Schlüssel gefunden"
    )


async def _handle_oidc_jwt(session: AsyncSession, request: Request) -> CurrentUser:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")

    token = auth_header.removeprefix("Bearer ")
    try:
        from jose import jwt

        # Fetch the correct RSA public key from OIDC JWKS
        rsa_key = await _get_oidc_signing_key(token)

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.oidc_client_id,
            issuer=settings.oidc_issuer,
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Ungültiges Token")

        # Validate issuer matches configured issuer
        if payload.get("iss") != settings.oidc_issuer:
            raise HTTPException(
                status_code=401, detail="Token-Issuer stimmt nicht überein"
            )

        # Extract standard OIDC claims
        username = payload.get("preferred_username", payload.get("sub", ""))
        email = payload.get("email", "")
        groups = payload.get("groups", [])
        if isinstance(groups, str):
            groups = [g.strip() for g in groups.split(",") if g.strip()]

        # Determine role from groups
        role = (
            UserRole.sec_team
            if settings.sec_team_group in groups
            else UserRole.team_member
        )

        # Namespaces from JWT claims (if available)
        ns_claim = payload.get("namespaces", "")
        has_all_namespaces = ns_claim.strip() == "*" if ns_claim else False
        namespaces = (
            []
            if has_all_namespaces
            else (_parse_namespaces_header(ns_claim) if ns_claim else [])
        )

        # Auto-create/upsert user on first OIDC login
        user_data = {
            "id": user_id,
            "username": username,
            "email": email,
            "role": role.value,
        }
        user = await _get_or_create_user(session, user_data)
        user = await _sync_user_fields(session, user, user_data)

        return _to_current_user(user, namespaces, has_all_namespaces=has_all_namespaces)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("OIDC auth failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentifizierung fehlgeschlagen")


def _validate_api_key(request: Request) -> bool:
    """Check if request has a valid spoke API key. Uses constant-time comparison."""
    api_key = request.headers.get("X-Api-Key")
    if not api_key or not settings.spoke_api_keys:
        return False
    return any(
        secrets.compare_digest(api_key, allowed_key)
        for allowed_key in settings.spoke_api_keys
    )


async def get_current_user(request: Request) -> CurrentUser:
    async with AppSessionLocal() as session:
        # 1. Dev mode (local development only)
        if settings.dev_mode:
            return await _handle_dev_mode(session)

        # 2. Spoke proxy mode (X-Api-Key + X-Forwarded-* headers)
        if _validate_api_key(request):
            return await _handle_spoke_proxy(session, request)

        # 3. Direct OIDC JWT (hub-local access)
        return await _handle_oidc_jwt(session, request)


def require_sec_team(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not current_user.is_sec_team:
        raise HTTPException(
            status_code=403, detail="Nur für das Security-Team zugänglich"
        )
    return current_user
