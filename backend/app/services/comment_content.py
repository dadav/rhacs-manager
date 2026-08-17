"""Structured comment content: ordered text/mention segments.

Comments carry two representations that always agree:

- ``message``: the legacy ``@[username]`` plain-text form. Kept for old API
  clients and as the human-readable fallback.
- ``content_segments``: an ordered list of immutable segments. A mention is
  backed by a stable ``user_id`` plus a ``username`` snapshot (the fallback
  display when the user is later deleted). Text segments hold raw text.

Segment shapes (see plan.md):
  text:    {"type": "text", "text": "..."}
  mention: {"type": "mention", "user_id": "...", "username": "<snapshot>"}
"""

import re

SEGMENT_TEXT = "text"
SEGMENT_MENTION = "mention"

# Matches the legacy inline mention token ``@[username]``.
_MENTION_RE = re.compile(r"@\[([^\]]+)\]")


def legacy_mention_names(message: str) -> set[str]:
    """Return distinct lower-cased usernames from legacy mention tokens."""
    return {name.lower() for name in _MENTION_RE.findall(message)}


def parse_message_to_segments(message: str, name_to_user: dict[str, tuple[str, str]]) -> list[dict]:
    """Split a legacy ``@[username]`` message into ordered segments.

    ``name_to_user`` maps ``lower(username)`` to ``(user_id, canonical_username)``.
    Tokens that resolve become mention segments; unknown tokens stay as literal
    text. Adjacent text is merged so the output is minimal and deterministic.
    """
    segments: list[dict] = []
    pos = 0

    def _append_text(text: str) -> None:
        if not text:
            return
        if segments and segments[-1]["type"] == SEGMENT_TEXT:
            segments[-1]["text"] += text
        else:
            segments.append({"type": SEGMENT_TEXT, "text": text})

    for match in _MENTION_RE.finditer(message):
        _append_text(message[pos : match.start()])
        raw_name = match.group(1)
        resolved = name_to_user.get(raw_name.lower())
        if resolved is not None:
            user_id, canonical = resolved
            segments.append({"type": SEGMENT_MENTION, "user_id": user_id, "username": canonical})
        else:
            # Unknown mention: keep the literal token as ordinary text.
            _append_text(match.group(0))
        pos = match.end()

    _append_text(message[pos:])
    return segments


def segments_to_message(segments: list[dict]) -> str:
    """Render segments back to the legacy ``@[username]`` message form."""
    parts: list[str] = []
    for seg in segments:
        if seg.get("type") == SEGMENT_MENTION:
            parts.append(f"@[{seg.get('username') or ''}]")
        else:
            parts.append(seg.get("text", ""))
    return "".join(parts)


def segments_to_display_text(segments: list[dict], id_to_display: dict[str, str]) -> str:
    """Render user-facing text with current display names for mention segments."""
    parts: list[str] = []
    for segment in segments:
        if segment.get("type") == SEGMENT_MENTION:
            user_id = segment.get("user_id")
            fallback = segment.get("username") or ""
            parts.append(f"@{id_to_display.get(user_id, fallback)}")
        else:
            parts.append(segment.get("text", ""))
    return "".join(parts)


def mention_user_ids(segments: list[dict] | None) -> list[str]:
    """Ordered, de-duplicated mention user_ids in the given segments."""
    if not segments:
        return []
    seen: set[str] = set()
    ordered: list[str] = []
    for seg in segments:
        if seg.get("type") == SEGMENT_MENTION:
            uid = seg.get("user_id")
            if uid and uid not in seen:
                seen.add(uid)
                ordered.append(uid)
    return ordered


def enrich_segments(segments: list[dict] | None, id_to_display: dict[str, str]) -> list[dict] | None:
    """Return a response copy where mention segments carry the current
    ``display_name`` for their user (falling back to the stored snapshot)."""
    if segments is None:
        return None
    enriched: list[dict] = []
    for seg in segments:
        if seg.get("type") == SEGMENT_MENTION:
            uid = seg.get("user_id")
            snapshot = seg.get("username") or ""
            enriched.append(
                {
                    "type": SEGMENT_MENTION,
                    "user_id": uid,
                    "username": snapshot,
                    "display_name": id_to_display.get(uid, snapshot),
                }
            )
        else:
            enriched.append({"type": SEGMENT_TEXT, "text": seg.get("text", "")})
    return enriched
