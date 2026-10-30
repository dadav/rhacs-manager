import { Modal, ModalBody, ModalHeader, Spinner, TextArea, TextInput } from "@patternfly/react-core";
import { useRef, useState, useEffect, useCallback, useId } from "react";
import { useTranslation } from "react-i18next";
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

/** Fixed list height so the picker never grows or shrinks with the result count. */
const PICKER_LIST_HEIGHT = 320;
const PICKER_WIDTH = 480;

export function MentionTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  style,
  isDisabled,
}: MentionTextAreaProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  // Index of the typed "@" in the derived text; replaced by the picked mention.
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedOptionRef = useRef<HTMLDivElement | null>(null);
  const idBase = useId();
  const listboxId = `${idBase}-listbox`;
  const optionId = (i: number) => `${idBase}-option-${i}`;

  const text = segmentsToText(value);
  const { data: users, isLoading } = useUserSearch(pickerQuery, pickerOpen);
  const userCount = users?.length ?? 0;
  const activeIndex = userCount === 0 ? -1 : Math.min(selectedIndex, userCount - 1);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>, val: string) => {
      onChange(applyTextEdit(value, val));

      // Value and cursor come from the same event, so mentionStart always
      // points at the "@" that was just typed.
      const cursorPos = event.currentTarget.selectionStart ?? val.length;
      const before = val.slice(0, cursorPos);
      if (/(^|\s)@$/.test(before)) {
        setMentionStart(cursorPos - 1);
        setPickerQuery("");
        setSelectedIndex(0);
        setPickerOpen(true);
      }
    },
    [onChange, value],
  );

  const focusTextarea = useCallback((cursorPos: number) => {
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, []);

  const cancelPicker = useCallback(() => {
    setPickerOpen(false);
    setPickerQuery("");
    focusTextarea(mentionStart + 1);
  }, [focusTextarea, mentionStart]);

  const insertMention = useCallback(
    (user: { id: string; username: string; display_name: string }) => {
      setPickerOpen(false);
      setPickerQuery("");
      if (segmentsToText(value)[mentionStart] !== "@") {
        console.warn("MentionTextArea: '@' not found at mention start, mention not inserted", {
          mentionStart,
        });
        focusTextarea(mentionStart + 1);
        return;
      }
      // Replace the typed "@" with a real mention segment + a space.
      const display = user.display_name || user.username;
      const next = spliceSegments(value, mentionStart, mentionStart + 1, [
        { type: "mention", user_id: user.id, username: user.username, display },
        { type: "text", text: " " },
      ]);
      onChange(next);
      focusTextarea(mentionStart + `@${display} `.length);
    },
    [value, mentionStart, onChange, focusTextarea],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isNext = (e.key === "Tab" && !e.shiftKey) || e.key === "ArrowDown";
      const isPrevious = (e.key === "Tab" && e.shiftKey) || e.key === "ArrowUp";
      if (isNext) {
        // Tab never leaves the search field while the picker is open.
        e.preventDefault();
        setSelectedIndex(Math.min(activeIndex + 1, Math.max(userCount - 1, 0)));
      } else if (isPrevious) {
        e.preventDefault();
        setSelectedIndex(Math.max(activeIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (users && activeIndex >= 0) insertMention(users[activeIndex]);
      }
    },
    [activeIndex, userCount, users, insertMention],
  );

  // disableFocusTrap makes PF ignore elementToFocus, so focus the search field explicitly.
  useEffect(() => {
    if (!pickerOpen) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [pickerOpen]);

  useEffect(() => {
    const el = selectedOptionRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, pickerOpen]);

  return (
    <div>
      <TextArea
        ref={(el) => {
          textareaRef.current = el as unknown as HTMLTextAreaElement;
        }}
        value={text}
        onChange={handleChange}
        rows={rows}
        placeholder={placeholder}
        style={style}
        isDisabled={isDisabled}
      />
      <Modal
        isOpen={pickerOpen}
        variant="small"
        width={PICKER_WIDTH}
        aria-label={t("mentionPicker.title")}
        onClose={cancelPicker}
        // Tab/Shift+Tab select entries; an active focus trap would move focus first.
        disableFocusTrap
      >
        <ModalHeader title={t("mentionPicker.title")} />
        <ModalBody>
          <TextInput
            ref={searchInputRef}
            type="search"
            value={pickerQuery}
            onChange={(_event, val) => {
              setPickerQuery(val);
              setSelectedIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            aria-label={t("mentionPicker.searchLabel")}
            placeholder={t("mentionPicker.searchPlaceholder")}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
          />
          <div
            id={listboxId}
            role="listbox"
            aria-label={t("mentionPicker.title")}
            data-testid="mention-picker-list"
            style={{
              height: PICKER_LIST_HEIGHT,
              overflowY: "auto",
              overscrollBehavior: "contain",
              marginTop: 8,
              border: "1px solid var(--pf-t--global--border--color--default)",
              borderRadius: 4,
            }}
          >
            {isLoading && userCount === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <Spinner size="md" />
              </div>
            ) : userCount === 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "var(--pf-t--global--text--color--subtle)",
                }}
              >
                {t("mentionPicker.noResults")}
              </div>
            ) : (
              users?.map((user, i) => (
                <div
                  key={user.id}
                  id={optionId(i)}
                  ref={i === activeIndex ? selectedOptionRef : undefined}
                  role="option"
                  aria-selected={i === activeIndex}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(user);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    background:
                      i === activeIndex
                        ? "var(--pf-t--global--background--color--secondary--default)"
                        : "transparent",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</span>
                  <span style={{ fontSize: 11, color: "var(--pf-t--global--text--color--subtle)" }}>
                    @{user.username}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--pf-t--global--text--color--subtle)" }}>
            {t("mentionPicker.keyboardHint")}
          </div>
        </ModalBody>
      </Modal>
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
