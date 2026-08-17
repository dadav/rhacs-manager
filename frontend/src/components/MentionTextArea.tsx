import { TextArea } from "@patternfly/react-core";
import { useRef, useState, useEffect, useCallback } from "react";
import { useUserSearch } from "../api/auth";
import type { CommentContentSegment, CommentInputSegment } from "../types";

/**
 * Composer content is an ordered list of semantic segments. A mention is a
 * first-class segment carrying a stable user_id (displayed as "@Full Name"),
 * NOT a text token. This is what makes "@Alice" typed-by-hand differ from a
 * mention picked from the suggestion list: only picked ones become mention
 * segments, so only they notify.
 */
export type ComposerSegment =
  | { type: "text"; text: string }
  | { type: "mention"; user_id: string; username: string; display: string };

function segmentText(seg: ComposerSegment): string {
  return seg.type === "mention" ? `@${seg.display}` : seg.text;
}

/** Derived plain text the textarea shows. */
export function segmentsToText(segments: ComposerSegment[]): string {
  return segments.map(segmentText).join("");
}

/** Drop empty text segments and merge adjacent ones for a minimal, stable model. */
function normalize(segments: ComposerSegment[]): ComposerSegment[] {
  const out: ComposerSegment[] = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      if (seg.text === "") continue;
      const last = out[out.length - 1];
      if (last && last.type === "text") {
        last.text += seg.text;
        continue;
      }
    }
    out.push({ ...seg });
  }
  return out;
}

/**
 * Return the portion of ``segments`` covering the derived-text range [from, to).
 * Mentions fully inside the range keep their identity; a mention only partially
 * inside is demoted to plain text (this is how "editing inside a mention" turns
 * it back into ordinary text).
 */
function segmentsInRange(segments: ComposerSegment[], from: number, to: number): ComposerSegment[] {
  const res: ComposerSegment[] = [];
  let pos = 0;
  for (const seg of segments) {
    const text = segmentText(seg);
    const segStart = pos;
    const segEnd = pos + text.length;
    pos = segEnd;
    const a = Math.max(segStart, from);
    const b = Math.min(segEnd, to);
    if (a >= b) continue;
    if (seg.type === "mention" && a === segStart && b === segEnd) {
      res.push(seg);
    } else {
      res.push({ type: "text", text: text.slice(a - segStart, b - segStart) });
    }
  }
  return res;
}

/** Replace derived-text range [start, end) with ``insert`` segments. */
function spliceSegments(
  segments: ComposerSegment[],
  start: number,
  end: number,
  insert: ComposerSegment[],
): ComposerSegment[] {
  const total = segmentsToText(segments).length;
  return normalize([
    ...segmentsInRange(segments, 0, start),
    ...insert,
    ...segmentsInRange(segments, end, total),
  ]);
}

/** Apply a free-text edit (old -> new) as a single minimal splice so that
 * mentions outside the changed region keep their identity. Exported for tests. */
export function applyTextEdit(segments: ComposerSegment[], newText: string): ComposerSegment[] {
  const oldText = segmentsToText(segments);
  if (newText === oldText) return segments;
  const maxPrefix = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < maxPrefix - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const changedStart = prefix;
  const changedOldEnd = oldText.length - suffix;
  const inserted = newText.slice(prefix, newText.length - suffix);
  return spliceSegments(segments, changedStart, changedOldEnd, [{ type: "text", text: inserted }]);
}

/** Convert composer segments to the API wire form. */
export function contentToApi(segments: ComposerSegment[]): CommentInputSegment[] {
  return normalize(segments).map((seg) =>
    seg.type === "mention"
      ? { type: "mention", user_id: seg.user_id, username: seg.username }
      : { type: "text", text: seg.text },
  );
}

/** Rebuild composer segments from API content (for editing an existing comment). */
export function apiToContent(content: CommentContentSegment[] | null | undefined): ComposerSegment[] {
  if (!content) return [];
  return content.map((seg) =>
    seg.type === "mention"
      ? { type: "mention", user_id: seg.user_id, username: seg.username, display: seg.display_name || seg.username }
      : { type: "text", text: seg.text },
  );
}

/** True when the composer holds only whitespace (nothing worth submitting). */
export function contentIsEmpty(segments: ComposerSegment[]): boolean {
  return !segments.some((s) => (s.type === "mention" ? true : s.text.trim() !== ""));
}

interface MentionTextAreaProps {
  value: ComposerSegment[];
  onChange: (value: ComposerSegment[]) => void;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
  isDisabled?: boolean;
}

export function MentionTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  style,
  isDisabled,
}: MentionTextAreaProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const text = segmentsToText(value);
  const { data: users } = useUserSearch(mentionQuery, showDropdown);

  const handleChange = useCallback(
    (_: unknown, val: string) => {
      onChange(applyTextEdit(value, val));

      const el = textareaRef.current;
      if (!el) return;
      setTimeout(() => {
        const cursorPos = el.selectionStart;
        const before = val.slice(0, cursorPos);
        // Keep spaces in the active query so users can search a full name.
        // Newlines and sentence punctuation end the mention candidate.
        const bareMatch = before.match(/(^|[\s])@([^@\n,;:!?()]*)$/);
        if (bareMatch) {
          setMentionQuery(bareMatch[2]);
          setMentionStart(cursorPos - bareMatch[2].length - 1);
          setShowDropdown(true);
          setSelectedIndex(0);
        } else {
          setShowDropdown(false);
          setMentionQuery("");
        }
      }, 0);
    },
    [onChange, value],
  );

  const insertMention = useCallback(
    (user: { id: string; username: string; display_name: string }) => {
      // Replace the "@query" token span with a real mention segment + a space.
      const tokenEnd = mentionStart + 1 + mentionQuery.length;
      const display = user.display_name || user.username;
      const next = spliceSegments(value, mentionStart, tokenEnd, [
        { type: "mention", user_id: user.id, username: user.username, display },
        { type: "text", text: " " },
      ]);
      onChange(next);
      setShowDropdown(false);
      setMentionQuery("");

      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          const pos = mentionStart + `@${display} `.length;
          el.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, mentionStart, mentionQuery, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || !users?.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (users[selectedIndex]) {
          e.preventDefault();
          insertMention(users[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, users, selectedIndex, insertMention],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <TextArea
        ref={(el) => {
          textareaRef.current = el as unknown as HTMLTextAreaElement;
        }}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        style={style}
        isDisabled={isDisabled}
      />
      {showDropdown && users && users.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            zIndex: 1000,
            background: "var(--pf-t--global--background--color--primary--default)",
            border: "1px solid var(--pf-t--global--border--color--default)",
            borderRadius: 4,
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            maxHeight: 220,
            overflowY: "auto",
            minWidth: 220,
            marginBottom: 4,
          }}
        >
          {users.map((user, i) => (
            <div
              key={user.id}
              role="option"
              aria-selected={i === selectedIndex}
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                background:
                  i === selectedIndex
                    ? "var(--pf-t--global--background--color--secondary--default)"
                    : "transparent",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</span>
              <span style={{ fontSize: 11, color: "var(--pf-t--global--text--color--subtle)" }}>
                @{user.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Render comment content. Prefers structured ``content`` segments (mentions
 * shown as "@Full Name"); falls back to the legacy ``@[username]`` message for
 * rows that were never backfilled.
 */
export function renderContent(
  content: CommentContentSegment[] | null | undefined,
  message: string,
): React.ReactNode {
  if (!content) return renderMentions(message);
  return content.map((seg, i) => {
    if (seg.type === "mention") {
      return (
        <span
          key={i}
          style={{ color: "var(--pf-t--global--color--blue--default)", fontWeight: 600 }}
        >
          @{seg.display_name || seg.username}
        </span>
      );
    }
    return <span key={i}>{seg.text}</span>;
  });
}

/**
 * Legacy renderer for ``@[username]`` messages (comments with no structured
 * content). Brackets are stripped; only the styled @username is shown.
 */
export function renderMentions(message: string): React.ReactNode {
  const parts = message.split(/(@\[[^\]]+\])/g);
  if (parts.length === 1) return message;

  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]$/);
    if (match) {
      return (
        <span
          key={i}
          style={{ color: "var(--pf-t--global--color--blue--default)", fontWeight: 600 }}
        >
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
