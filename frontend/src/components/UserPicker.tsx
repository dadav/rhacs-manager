import { TextInput } from '@patternfly/react-core'
import { useState } from 'react'
import { useUserSearch, type UserSearchResult } from '../api/auth'

// Search-as-you-type user picker. Shows display_name as primary text and
// @username as secondary text (identity vs. display name convention).

interface UserPickerProps {
  onSelect: (user: UserSearchResult) => void
  placeholder: string
  ariaLabel: string
  userRole?: string
}

export function UserPicker({ onSelect, placeholder, ariaLabel, userRole }: UserPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { data: candidates } = useUserSearch(query, open, userRole)

  return (
    <div style={{ position: 'relative' }}>
      <TextInput
        value={query}
        onChange={(_, v) => {
          setQuery(v)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={{ fontSize: 13 }}
      />
      {open && candidates && candidates.length > 0 && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--pf-t--global--background--color--primary--default)',
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
            maxHeight: 200,
            overflowY: 'auto',
            marginTop: 2,
          }}
        >
          {candidates.map(user => (
            <div
              key={user.id}
              role="option"
              aria-selected={false}
              tabIndex={-1}
              onMouseDown={(e) => {
                // mousedown + preventDefault keeps the input from blurring before selection
                e.preventDefault()
                onSelect(user)
                setQuery('')
                setOpen(false)
              }}
              style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--pf-t--global--background--color--secondary--default)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</span>
              <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>@{user.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
