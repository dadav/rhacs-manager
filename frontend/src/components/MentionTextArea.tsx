import { TextArea } from "@patternfly/react-core";
import { useRef, useState, useEffect, useCallback } from "react";
import { useUserSearch } from "../api/auth";

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  style?: React.CSSProperties;
}

/**
 * Mentions are stored as `@[Username]` in the message text.
 * This makes parsing unambiguous even when usernames contain spaces.
 */

export function MentionTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  style,
}: MentionTextAreaProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { data: users } = useUserSearch(mentionQuery, showDropdown);

  const handleChange = useCallback(
    (_: unknown, val: string) => {
      onChange(val);

      const el = textareaRef.current;
      if (!el) return;

      setTimeout(() => {
        const cursorPos = el.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);

        // Match @[partial...  (user is typing inside brackets)
        // or @partial        (user is typing without brackets — we filter live)
        // or @               (just typed @, show all users)
        const bracketMatch = textBeforeCursor.match(/@\[([^\]]*)$/);
        const bareMatch = textBeforeCursor.match(/(^|[\s])@([^\s@]*)$/);

        if (bracketMatch) {
          setMentionQuery(bracketMatch[1]);
          setMentionStart(cursorPos - bracketMatch[0].length);
          setShowDropdown(true);
          setSelectedIndex(0);
        } else if (bareMatch) {
          setMentionQuery(bareMatch[2]);
          // mentionStart points to the @ character
          setMentionStart(cursorPos - bareMatch[2].length - 1);
          setShowDropdown(true);
          setSelectedIndex(0);
        } else {
          setShowDropdown(false);
          setMentionQuery("");
        }
      }, 0);
    },
    [onChange],
  );

  const insertMention = useCallback(
    (username: string) => {
      const before = value.slice(0, mentionStart);
      // Skip past whatever the user typed: @ or @[ + partial text
      const textAfterMentionStart = value.slice(mentionStart);
      const skipMatch = textAfterMentionStart.match(/^@\[[^\]]*\]?|^@[^\s]*/);
      const skipLength = skipMatch ? skipMatch[0].length : 1;
      const after = value.slice(mentionStart + skipLength);
      const mention = `@[${username}]`;
      const newValue = `${before}${mention} ${after}`;
      onChange(newValue);
      setShowDropdown(false);
      setMentionQuery("");

      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          const pos = before.length + mention.length + 1;
          el.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, mentionStart, onChange],
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
          insertMention(users[selectedIndex].username);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, users, selectedIndex, insertMention],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        style={style}
      />
      {showDropdown && users && users.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            zIndex: 1000,
            background:
              "var(--pf-t--global--background--color--primary--default)",
            border: "1px solid var(--pf-t--global--border--color--default)",
            borderRadius: 4,
            boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
            maxHeight: 200,
            overflowY: "auto",
            minWidth: 200,
            marginBottom: 4,
          }}
        >
          {users.map((user, i) => (
            <div
              key={user.id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user.username);
              }}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 13,
                background:
                  i === selectedIndex
                    ? "var(--pf-t--global--background--color--secondary--default)"
                    : "transparent",
              }}
            >
              @{user.username}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a comment message with @[username] mentions highlighted.
 * The brackets are stripped in the display — only the @username is shown styled.
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
          style={{
            color: "var(--pf-t--global--color--blue--default)",
            fontWeight: 600,
          }}
        >
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
