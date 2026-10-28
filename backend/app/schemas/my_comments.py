"""Response schema for the personal comment-thread overview (``GET /comments/mine``).

One row per thread the current user commented in. A thread is all comments on
one CVE (``cve_comments`` keyed by ``cve_id``, escalation-scoped comments
included) or on one risk acceptance (``risk_acceptance_comments``).
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from .comment import ContentSegment
from .cve import EscalationContext

MyCommentKind = Literal["cve", "risk_acceptance", "escalation"]


class MyCommentThread(BaseModel):
    kind: MyCommentKind
    cve_id: str
    risk_acceptance_id: UUID | None = None
    # Sec team only, taken from the user's latest own comment in the thread.
    escalation_context: EscalationContext | None = None

    my_comment_count: int
    my_last_comment_id: UUID
    my_last_comment_at: datetime
    my_last_message: str
    my_last_content: list[ContentSegment] | None = None

    # Comments by other users ordered after the user's latest own comment.
    # Always 0 / null when thread_available is false (no activity leak).
    replies_since: int = 0
    last_reply_at: datetime | None = None
    last_reply_by_name: str | None = None

    # thread_available: the thread can be read through the existing comment
    # endpoints. detail_available: the CVE / RA detail page will load.
    # They differ for CVEs that no longer affect the user's namespaces: the
    # comment thread is global per CVE, the detail page 404s.
    thread_available: bool
    detail_available: bool
    detail_link: str | None = None
