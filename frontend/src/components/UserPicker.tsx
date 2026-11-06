import { Button, Modal, ModalBody, ModalHeader, Spinner, TextInput } from '@patternfly/react-core'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserSearch, type UserSearchResult } from '../api/auth'

// The single user selection UI. Shows display_name as primary text and
// @username as secondary text (identity vs. display name convention).

/** Fixed list height so the picker never grows or shrinks with the result count. */
const PICKER_LIST_HEIGHT = 320
const PICKER_WIDTH = 480

// disableFocusTrap makes PF ignore elementToFocus, so the search field is focused explicitly.
// Must render inside the Modal: PF mounts the content one state update after isOpen turns
// true, so an effect in the parent or a deferred frame can run before the input exists.
// autoFocus is not enough either: StrictMode's simulated unmount runs PF FocusTrap's cleanup,
// which moves focus back. This effect re-runs after that cleanup, and on reopen while the
// content is still rendered for the close animation.
function FocusWhenOpen({ isOpen, targetRef }: { isOpen: boolean; targetRef: RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    if (isOpen) targetRef.current?.focus()
  }, [isOpen, targetRef])
  return null
}

interface UserPickerModalProps {
  isOpen: boolean
  title: string
  onSelect: (user: UserSearchResult) => void
  onCancel: () => void
  userRole?: string
}

// Stays mounted and is controlled by isOpen: PatternFly keeps the content rendered
// during its close animation, and returns focus to the previously active element
// when that content unmounts (also with disableFocusTrap).
export function UserPickerModal({ isOpen, title, onSelect, onCancel, userRole }: UserPickerModalProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const selectedOptionRef = useRef<HTMLDivElement | null>(null)
  const idBase = useId()
  const listboxId = `${idBase}-listbox`
  const optionId = (i: number) => `${idBase}-option-${i}`

  const { data: users, isLoading } = useUserSearch(query, isOpen, userRole)
  const userCount = users?.length ?? 0
  const activeIndex = userCount === 0 ? -1 : Math.min(selectedIndex, userCount - 1)

  function selectUser(user: UserSearchResult) {
    // The search field keeps focus during the close animation; a second Enter must not select again.
    if (!isOpen) return
    onSelect(user)
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const isNext = (e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowDown'
    const isPrevious = (e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowUp'
    if (isNext) {
      // Tab never leaves the search field while the picker is open.
      e.preventDefault()
      setSelectedIndex(Math.min(activeIndex + 1, Math.max(userCount - 1, 0)))
    } else if (isPrevious) {
      e.preventDefault()
      setSelectedIndex(Math.max(activeIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (users && activeIndex >= 0) selectUser(users[activeIndex])
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setSelectedIndex(0)
  }, [isOpen])

  useEffect(() => {
    const el = selectedOptionRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, isOpen])

  let listContent: ReactNode
  if (isLoading && userCount === 0) {
    listContent = (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spinner size="md" />
      </div>
    )
  } else if (userCount === 0) {
    listContent = (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: 'var(--pf-t--global--text--color--subtle)',
        }}
      >
        {t('userPicker.noResults')}
      </div>
    )
  } else {
    listContent = users?.map((user, i) => (
      <div
        key={user.id}
        id={optionId(i)}
        ref={i === activeIndex ? selectedOptionRef : undefined}
        role="option"
        aria-selected={i === activeIndex}
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault()
          selectUser(user)
        }}
        onMouseEnter={() => setSelectedIndex(i)}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          background: i === activeIndex ? 'var(--pf-t--global--background--color--secondary--default)' : 'transparent',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</span>
        <span style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle)' }}>@{user.username}</span>
      </div>
    ))
  }

  return (
    <Modal
      isOpen={isOpen}
      variant="small"
      width={PICKER_WIDTH}
      aria-label={title}
      onClose={onCancel}
      // Tab/Shift+Tab select entries; an active focus trap would move focus first.
      disableFocusTrap
    >
      <ModalHeader title={title} />
      <ModalBody>
        <TextInput
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(_event, val) => {
            setQuery(val)
            setSelectedIndex(0)
          }}
          onKeyDown={handleSearchKeyDown}
          aria-label={t('userPicker.searchLabel')}
          placeholder={t('userPicker.searchPlaceholder')}
          role="combobox"
          aria-expanded
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
        />
        <FocusWhenOpen isOpen={isOpen} targetRef={searchInputRef} />
        <div
          id={listboxId}
          role="listbox"
          aria-label={title}
          data-testid="user-picker-list"
          style={{
            height: PICKER_LIST_HEIGHT,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            marginTop: 8,
            border: '1px solid var(--pf-t--global--border--color--default)',
            borderRadius: 4,
          }}
        >
          {listContent}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)' }}>
          {t('userPicker.keyboardHint')}
        </div>
      </ModalBody>
    </Modal>
  )
}

interface UserPickerProps {
  label: string
  title: string
  onSelect: (user: UserSearchResult) => void
  userRole?: string
  variant?: 'secondary' | 'link'
  size?: 'sm' | 'default'
  // aria-disabled, not disabled: focus returns to this button when the modal closes.
  isAriaDisabled?: boolean
}

/** Button that opens the user selection modal. Must stay mounted across a selection. */
export function UserPicker({
  label,
  title,
  onSelect,
  userRole,
  variant = 'secondary',
  size = 'sm',
  isAriaDisabled,
}: UserPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} isAriaDisabled={isAriaDisabled} onClick={() => setIsOpen(true)}>
        {label}
      </Button>
      <UserPickerModal
        isOpen={isOpen}
        title={title}
        userRole={userRole}
        onCancel={() => setIsOpen(false)}
        onSelect={(user) => {
          setIsOpen(false)
          onSelect(user)
        }}
      />
    </>
  )
}
