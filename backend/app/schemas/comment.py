"""Shared comment content schemas: legacy message vs structured segments.

A comment create/update request carries EXACTLY ONE representation:

- Legacy ``{"message": "...@[username]..."}`` — current text form, still
  resolved case-insensitively.
- Structured ``{"content": [segments]}`` — used by the updated UI, where each
  mention is user-id backed.

Responses always keep ``message`` (legacy clients) and add enriched ``content``.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from ..i18n import translate

MAX_COMMENT_LEN = 5000


class TextSegmentIn(BaseModel):
    type: Literal["text"]
    text: str = Field(max_length=MAX_COMMENT_LEN)


class MentionSegmentIn(BaseModel):
    type: Literal["mention"]
    user_id: str = Field(min_length=1, max_length=255)
    # Optional fallback snapshot from the client; the server overwrites it with
    # the canonical username on store, so it is not trusted for identity.
    username: str | None = Field(default=None, max_length=255)


ContentSegmentIn = Annotated[TextSegmentIn | MentionSegmentIn, Field(discriminator="type")]


class CommentInput(BaseModel):
    """Base body accepting exactly one of ``message`` or ``content``."""

    message: str | None = Field(default=None, min_length=1, max_length=MAX_COMMENT_LEN)
    content: list[ContentSegmentIn] | None = None

    @model_validator(mode="after")
    def _exactly_one_representation(self) -> "CommentInput":
        if (self.message is None) == (self.content is None):
            raise ValueError(translate("comment_content_required"))
        if self.content is not None:
            if not self.content:
                raise ValueError(translate("comment_content_required"))
            total = sum(len(s.text) for s in self.content if isinstance(s, TextSegmentIn))
            if total > MAX_COMMENT_LEN:
                raise ValueError(translate("comment_too_long"))
        return self


class ContentMentionSegment(BaseModel):
    """Response mention segment: stable id, snapshot, and current display name."""

    type: Literal["mention"] = "mention"
    user_id: str
    username: str
    display_name: str


class ContentTextSegment(BaseModel):
    type: Literal["text"] = "text"
    text: str


ContentSegment = Annotated[ContentTextSegment | ContentMentionSegment, Field(discriminator="type")]
