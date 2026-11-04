"""OIDC JWT verification in _handle_oidc_jwt (PyJWT, RS256 only).

The JWKS fetch and the user upsert are stubbed; the token signature, algorithm,
audience and issuer checks run for real.
"""

import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from starlette.requests import Request

from app.auth import middleware as mw
from app.config import settings
from app.models.user import User, UserRole

ISSUER = "https://idp.example.com/realms/test"
CLIENT_ID = "rhacs-manager"
KID = "test-key-1"


@pytest.fixture(scope="module")
def private_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="module")
def public_jwk(private_key) -> dict:
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    jwk.update({"kid": KID, "use": "sig", "alg": "RS256"})
    return jwk


@pytest.fixture(autouse=True)
def oidc_env(monkeypatch, public_jwk):
    monkeypatch.setattr(settings, "oidc_issuer", ISSUER)
    monkeypatch.setattr(settings, "oidc_client_id", CLIENT_ID)

    async def fake_signing_key(token: str) -> dict:
        return public_jwk

    async def fake_get_or_create_user(session, user_data, placeholder_email=""):
        return User(
            id=user_data["id"],
            username=user_data["username"],
            full_name=user_data["full_name"],
            email=user_data["email"],
            role=UserRole(user_data["role"]),
            onboarding_completed=True,
        )

    async def fake_sync_user_fields(session, user, user_data):
        return user

    monkeypatch.setattr(mw, "_get_oidc_signing_key", fake_signing_key)
    monkeypatch.setattr(mw, "_get_or_create_user", fake_get_or_create_user)
    monkeypatch.setattr(mw, "_sync_user_fields", fake_sync_user_fields)


def _claims(**overrides) -> dict:
    now = int(time.time())
    claims = {
        "sub": "user-123",
        "iss": ISSUER,
        "aud": CLIENT_ID,
        "iat": now,
        "exp": now + 300,
        "preferred_username": "alice",
        "name": "Alice Example",
        "email": "alice@example.com",
        "groups": ["devs"],
        "namespaces": "payments:cluster-a",
    }
    claims.update(overrides)
    return claims


def _rs256_token(private_key, **overrides) -> str:
    return jwt.encode(_claims(**overrides), private_key, algorithm="RS256", headers={"kid": KID})


def _request(token: str) -> Request:
    return Request({"type": "http", "headers": [(b"authorization", f"Bearer {token}".encode())]})


async def test_valid_rs256_token_authenticates(private_key):
    user = await mw._handle_oidc_jwt(None, _request(_rs256_token(private_key)))
    assert user.id == "user-123"
    assert user.username == "alice"
    assert user.full_name == "Alice Example"
    assert user.namespaces == [("payments", "cluster-a")]
    assert not user.is_sec_team


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"aud": "other-client"}, id="wrong-audience"),
        pytest.param({"iss": "https://evil.example.com"}, id="wrong-issuer"),
        pytest.param({"exp": int(time.time()) - 60}, id="expired"),
    ],
)
async def test_invalid_claims_rejected(private_key, overrides):
    with pytest.raises(HTTPException) as exc_info:
        await mw._handle_oidc_jwt(None, _request(_rs256_token(private_key, **overrides)))
    assert exc_info.value.status_code == 401


async def test_token_signed_by_other_key_rejected():
    other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(HTTPException) as exc_info:
        await mw._handle_oidc_jwt(None, _request(_rs256_token(other_key)))
    assert exc_info.value.status_code == 401


async def test_hs256_signed_with_public_key_rejected(private_key):
    """Algorithm confusion (CVE-2024-33663 / CVE-2026-85394 class): an attacker
    who knows the public key signs an HS256 token with it as the HMAC secret."""
    public_der = private_key.public_key().public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    header = {"alg": "HS256", "kid": KID, "typ": "JWT"}
    signing_input = b".".join(
        jwt.utils.base64url_encode(json.dumps(part, separators=(",", ":")).encode()) for part in (header, _claims())
    )
    signature = jwt.algorithms.HMACAlgorithm(jwt.algorithms.HMACAlgorithm.SHA256).sign(signing_input, public_der)
    forged = (signing_input + b"." + jwt.utils.base64url_encode(signature)).decode()

    with pytest.raises(HTTPException) as exc_info:
        await mw._handle_oidc_jwt(None, _request(forged))
    assert exc_info.value.status_code == 401


async def test_missing_bearer_rejected():
    request = Request({"type": "http", "headers": []})
    with pytest.raises(HTTPException) as exc_info:
        await mw._handle_oidc_jwt(None, request)
    assert exc_info.value.status_code == 401
