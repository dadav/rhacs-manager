"""Route-level tests for the escalation endpoints.

Grouping/contact SQL semantics live in test_escalation_workspace.py (real DB).
These tests cover authorization, response shape, legacy compatibility, and the
text-free audit contract for the sec-team comment mutation.
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import httpx

from app.models.audit_log import AuditLog
from app.models.cve_comment import CveComment
from app.models.escalation import Escalation
from app.models.user import User, UserRole


def _result(scalar_one=None, rows=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = scalar_one
    r.scalar.return_value = 0
    r.scalars.return_value.all.return_value = rows or []
    r.__iter__ = lambda self: iter(rows or [])
    return r


# -- legacy compatibility --


async def test_legacy_list_escalations_ok(sec_team_client: httpx.AsyncClient):
    resp = await sec_team_client.get("/api/escalations")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_legacy_upcoming_ok(sec_team_client: httpx.AsyncClient):
    resp = await sec_team_client.get("/api/escalations/upcoming")
    assert resp.status_code == 200
    assert resp.json() == []


# -- active/search shape --


async def test_active_search_shape(sec_team_client: httpx.AsyncClient):
    resp = await sec_team_client.get("/api/escalations/active/search")
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["page"] == 1
    assert body["page_size"] == 20
    assert body["contact_counts"] == {"needs_action": 0, "contacted": 0}


async def test_active_search_team_member_ok(team_member_client: httpx.AsyncClient):
    from app.services.escalation_workspace import WorkspaceRow

    row = WorkspaceRow(
        id=uuid4(),
        cve_id="CVE-2024-1",
        namespace="payments",
        cluster_name="cluster-a",
        level=2,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
        contacted=True,
    )
    with patch(
        "app.routers.escalations.search_active_workspace",
        new=AsyncMock(return_value=([row], 1, {"needs_action": 0, "contacted": 1})),
    ) as search_workspace:
        resp = await team_member_client.get("/api/escalations/active/search?contact_status=contacted")
    assert resp.status_code == 200
    assert resp.json()["contact_counts"] is None
    assert resp.json()["items"][0]["contacted"] is None
    assert search_workspace.await_args.kwargs["contact_status"] is None


async def test_active_search_rejects_invalid_statuses(sec_team_client: httpx.AsyncClient):
    invalid_email = await sec_team_client.get("/api/escalations/active/search?email_status=invalid")
    invalid_contact = await sec_team_client.get("/api/escalations/active/search?contact_status=invalid")
    assert invalid_email.status_code == 422
    assert invalid_contact.status_code == 422


async def test_upcoming_search_shape(sec_team_client: httpx.AsyncClient):
    resp = await sec_team_client.get("/api/escalations/upcoming/search")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"items": [], "total": 0, "page": 1, "page_size": 20}


async def test_page_size_bounded(sec_team_client: httpx.AsyncClient):
    resp = await sec_team_client.get("/api/escalations/active/search?page_size=9999")
    assert resp.status_code == 422


# -- comment mutation authorization --


async def test_add_escalation_comment_forbidden_for_team_member(team_member_client: httpx.AsyncClient):
    resp = await team_member_client.post(f"/api/escalations/{uuid4()}/comments", json={"message": "hi"})
    assert resp.status_code == 403


async def test_add_escalation_comment_404_when_missing(sec_team_client: httpx.AsyncClient):
    # Default mock returns scalar_one_or_none=None -> escalation not found.
    resp = await sec_team_client.post(f"/api/escalations/{uuid4()}/comments", json={"message": "hi"})
    assert resp.status_code == 404


# -- comment mutation success + audit omits text --


async def test_add_escalation_comment_success_audits_without_text(
    sec_team_client: httpx.AsyncClient, mock_app_db: AsyncMock
):
    secret_text = "SENSITIVE contact details here"
    esc = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=2,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
    )
    mock_app_db.execute.side_effect = [_result(scalar_one=esc), _result(scalar_one=esc.id)]

    added: list = []

    def _add(obj):
        added.append(obj)
        if isinstance(obj, CveComment):
            if obj.id is None:
                obj.id = uuid4()
            if obj.created_at is None:
                obj.created_at = datetime(2026, 1, 2)

    # session.add is synchronous in real SQLAlchemy; override the AsyncMock so the
    # side_effect runs synchronously (an unawaited AsyncMock side_effect never fires).
    mock_app_db.add = MagicMock(side_effect=_add)

    with patch(
        "app.services.escalation_workspace.notif_svc.notify_mentions",
        new_callable=AsyncMock,
    ) as notify_mentions:
        resp = await sec_team_client.post(f"/api/escalations/{esc.id}/comments", json={"message": secret_text})
    assert resp.status_code == 201
    body = resp.json()
    assert body["message"] == secret_text
    assert body["escalation_context"] == {"cluster_name": "c1", "namespace": "ns1", "level": 2}

    # Comment is linked to the escalation.
    comment = next(o for o in added if isinstance(o, CveComment))
    assert comment.escalation_id == esc.id

    # Audit entry exists, is text-free, and carries structured context.
    audit = next(o for o in added if isinstance(o, AuditLog))
    assert audit.action == "escalation_comment_created"
    assert audit.entity_type == "escalation"
    assert "message" not in audit.details
    assert secret_text not in str(audit.details)
    assert audit.details["cve_id"] == "CVE-2024-1"
    assert audit.details["level"] == 2
    notify_mentions.assert_awaited_once()


async def test_add_escalation_comment_rejects_historical_row(
    sec_team_client: httpx.AsyncClient, mock_app_db: AsyncMock
):
    historical = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=1,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
    )
    mock_app_db.execute.side_effect = [_result(scalar_one=historical), _result(scalar_one=uuid4())]

    resp = await sec_team_client.post(
        f"/api/escalations/{historical.id}/comments",
        json={"message": "too late"},
    )

    assert resp.status_code == 409
    assert mock_app_db.add.call_count == 0


async def test_delete_linked_comment_audits_without_text(sec_team_client: httpx.AsyncClient, mock_app_db: AsyncMock):
    esc = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=3,
        triggered_at=datetime(2026, 1, 1),
        notified=False,
    )
    comment = CveComment(
        id=uuid4(),
        cve_id="CVE-2024-1",
        user_id="sec-user-1",
        message="SENSITIVE removal text",
        escalation_id=esc.id,
        created_at=datetime(2026, 1, 2),
    )
    mock_app_db.execute.side_effect = [_result(scalar_one=comment), _result(scalar_one=esc)]

    added: list = []
    mock_app_db.add = MagicMock(side_effect=added.append)

    resp = await sec_team_client.delete(f"/api/cves/CVE-2024-1/comments/{comment.id}")
    assert resp.status_code == 204

    audit = next(o for o in added if isinstance(o, AuditLog))
    assert audit.action == "escalation_comment_deleted"
    assert "message" not in audit.details
    assert "SENSITIVE" not in str(audit.details)
    assert audit.details["cve_id"] == "CVE-2024-1"
    assert audit.details["level"] == 3


async def test_scoped_comment_context_is_returned_to_sec_team(
    sec_team_client: httpx.AsyncClient, mock_app_db: AsyncMock
):
    esc = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=2,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
    )
    comment = CveComment(
        id=uuid4(),
        cve_id=esc.cve_id,
        user_id="sec-user-1",
        message="contacted",
        escalation_id=esc.id,
        created_at=datetime(2026, 1, 2),
    )
    author = User(id="sec-user-1", username="secadmin", email="s@x", role=UserRole.sec_team)

    mock_app_db.execute.side_effect = [
        _result(rows=[comment]),
        _result(rows=[esc]),
        _result(scalar_one=author),
    ]
    sec_response = await sec_team_client.get(f"/api/cves/{esc.cve_id}/comments")
    assert sec_response.status_code == 200
    assert sec_response.json()[0]["escalation_context"] == {
        "cluster_name": "c1",
        "namespace": "ns1",
        "level": 2,
    }


async def test_scoped_comment_context_is_hidden_from_team_member(
    team_member_client: httpx.AsyncClient, mock_app_db: AsyncMock
):
    esc = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=2,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
    )
    comment = CveComment(
        id=uuid4(),
        cve_id=esc.cve_id,
        user_id="sec-user-1",
        message="contacted",
        escalation_id=esc.id,
        created_at=datetime(2026, 1, 2),
    )
    author = User(id="sec-user-1", username="secadmin", email="s@x", role=UserRole.sec_team)
    mock_app_db.execute.side_effect = [_result(rows=[comment]), _result(scalar_one=author)]
    team_response = await team_member_client.get(f"/api/cves/{esc.cve_id}/comments")
    assert team_response.status_code == 200
    assert team_response.json()[0]["escalation_context"] is None


async def test_edit_scoped_comment_preserves_context_for_sec_team(
    sec_team_client: httpx.AsyncClient,
    mock_app_db: AsyncMock,
):
    esc = Escalation(
        id=uuid4(),
        cve_id="CVE-2024-1",
        cluster_name="c1",
        namespace="ns1",
        level=3,
        triggered_at=datetime(2026, 1, 1),
        notified=True,
    )
    comment = CveComment(
        id=uuid4(),
        cve_id=esc.cve_id,
        user_id="sec-user-1",
        message="before",
        escalation_id=esc.id,
        created_at=datetime(2026, 1, 2),
    )
    author = User(id="sec-user-1", username="secadmin", email="s@x", role=UserRole.sec_team)
    mock_app_db.execute.side_effect = [
        _result(scalar_one=comment),
        _result(scalar_one=author),
        _result(scalar_one=esc),
    ]

    response = await sec_team_client.patch(
        f"/api/cves/{esc.cve_id}/comments/{comment.id}",
        json={"message": "after"},
    )

    assert response.status_code == 200
    assert response.json()["escalation_context"]["level"] == 3
