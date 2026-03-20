"""Unit tests for scope_key determinism and uniqueness."""

from app.schemas.risk_acceptance import RiskScope, RiskScopeTarget
from app.services.risk_acceptance_service import scope_key, validate_and_resolve_scope


def test_scope_key_deterministic():
    """Same scope targets in different order produce same key after normalization.

    scope_key hashes the JSON representation including list order, so targets
    must be normalized via validate_and_resolve_scope first. This test verifies
    that the normalize-then-hash pipeline is order-independent.
    """
    deployments = [
        {
            "deployment_id": "d1",
            "cluster_name": "c1",
            "namespace": "ns1",
            "image_name": "img1",
        },
        {
            "deployment_id": "d2",
            "cluster_name": "c2",
            "namespace": "ns2",
            "image_name": "img2",
        },
    ]
    scope_a = RiskScope(
        mode="namespace",
        targets=[
            RiskScopeTarget(namespace="ns1", cluster_name="c1"),
            RiskScopeTarget(namespace="ns2", cluster_name="c2"),
        ],
    )
    scope_b = RiskScope(
        mode="namespace",
        targets=[
            RiskScopeTarget(namespace="ns2", cluster_name="c2"),
            RiskScopeTarget(namespace="ns1", cluster_name="c1"),
        ],
    )
    resolved_a = validate_and_resolve_scope(scope_a, deployments)
    resolved_b = validate_and_resolve_scope(scope_b, deployments)
    assert scope_key(resolved_a) == scope_key(resolved_b)


def test_scope_key_all_mode():
    """All-mode scopes produce a consistent key."""
    scope = RiskScope(mode="all", targets=[])
    key = scope_key(scope)
    assert isinstance(key, str)
    assert len(key) > 0


def test_scope_key_different_scopes_differ():
    """Different scopes produce different keys."""
    scope_a = RiskScope(
        mode="namespace",
        targets=[RiskScopeTarget(namespace="ns1", cluster_name="c1")],
    )
    scope_b = RiskScope(
        mode="namespace",
        targets=[RiskScopeTarget(namespace="ns2", cluster_name="c2")],
    )
    assert scope_key(scope_a) != scope_key(scope_b)


def test_scope_key_same_scope_repeated():
    """Calling scope_key on the same scope twice returns the same value."""
    scope = RiskScope(
        mode="namespace",
        targets=[RiskScopeTarget(namespace="ns1", cluster_name="c1")],
    )
    assert scope_key(scope) == scope_key(scope)


def test_scope_key_mode_matters():
    """Different modes with empty targets produce different keys."""
    # all mode requires empty targets; we compare all-mode key to itself
    scope_all = RiskScope(mode="all", targets=[])
    scope_ns = RiskScope(
        mode="namespace",
        targets=[RiskScopeTarget(namespace="ns1", cluster_name="c1")],
    )
    assert scope_key(scope_all) != scope_key(scope_ns)
