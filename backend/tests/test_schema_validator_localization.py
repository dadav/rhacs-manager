"""Pydantic request validators must localize their messages (§2b).

The validators raise ValueError(translate(code)); translate() resolves against
the request-scoped language ContextVar that LanguageMiddleware sets from
Accept-Language. Here we set the language directly (what the middleware does)
and assert the resulting ValidationError carries the right-language text.
"""

import pytest
from pydantic import ValidationError

from app.i18n import set_language
from app.schemas.risk_acceptance import RiskScope, RiskScopeTarget
from app.schemas.suppression_rule import SuppressionRuleCreate


def _target() -> RiskScopeTarget:
    return RiskScopeTarget(cluster_name="cluster-a", namespace="payments")


@pytest.fixture(autouse=True)
def _reset_language():
    yield
    set_language("de")


def test_risk_scope_all_with_targets_english():
    set_language("en")
    with pytest.raises(ValidationError) as exc:
        RiskScope(mode="all", targets=[_target()])
    assert "No targets may be specified for scope mode 'all'" in str(exc.value)


def test_risk_scope_all_with_targets_german():
    set_language("de")
    with pytest.raises(ValidationError) as exc:
        RiskScope(mode="all", targets=[_target()])
    assert "dürfen keine Targets" in str(exc.value)


def test_risk_scope_missing_targets_english():
    set_language("en")
    with pytest.raises(ValidationError) as exc:
        RiskScope(mode="namespace", targets=[])
    assert "Targets are required for the selected scope mode" in str(exc.value)


def test_suppression_component_name_required_english():
    set_language("en")
    with pytest.raises(ValidationError) as exc:
        SuppressionRuleCreate(type="component", reason="a" * 12)
    assert "component_name is required for type 'component'" in str(exc.value)


def test_suppression_cve_id_required_english():
    set_language("en")
    with pytest.raises(ValidationError) as exc:
        SuppressionRuleCreate(type="cve", reason="a" * 12)
    assert "cve_id is required for type 'cve'" in str(exc.value)
