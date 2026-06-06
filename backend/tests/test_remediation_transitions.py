"""Unit tests for the remediation status transition map.

Verification was removed: resolved is the terminal success state and no transition
produces `verified` anymore (legacy `verified` rows may only be reopened).
"""

from app.models.remediation import RemediationStatus
from app.routers.remediations import _TRANSITIONS


def test_resolved_is_terminal_except_reopen():
    assert _TRANSITIONS[RemediationStatus.resolved] == {RemediationStatus.in_progress}


def test_verified_is_never_a_transition_target():
    for targets in _TRANSITIONS.values():
        assert RemediationStatus.verified not in targets


def test_in_progress_can_resolve():
    assert RemediationStatus.resolved in _TRANSITIONS[RemediationStatus.in_progress]


def test_legacy_verified_can_reopen():
    assert _TRANSITIONS[RemediationStatus.verified] == {RemediationStatus.in_progress}
