import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { UserPicker } from './UserPicker'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

const USERS = [
  { id: 'u-alice', username: 'alice', full_name: 'Alice Example', display_name: 'Alice Example' },
  { id: 'u-albert', username: 'albert', full_name: 'Albert Other', display_name: 'Albert Other' },
]

const mockUseUserSearch = vi.fn()
vi.mock('../api/auth', () => ({
  useUserSearch: (query: string, enabled: boolean, role?: string) => mockUseUserSearch(query, enabled, role),
}))

async function openPicker(props: { userRole?: string } = {}) {
  const onSelect = vi.fn()
  render(<UserPicker label="Pick" title="Pick a person" onSelect={onSelect} {...props} />)
  const trigger = screen.getByRole('button', { name: 'Pick' })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = await screen.findByRole('dialog')
  const search = within(dialog).getByRole('combobox') as HTMLInputElement
  await waitFor(() => expect(document.activeElement).toBe(search))
  return { onSelect, trigger, search }
}

beforeEach(() => {
  mockUseUserSearch.mockReset()
  mockUseUserSearch.mockImplementation((query: string, enabled: boolean) => ({
    isLoading: false,
    data: enabled ? USERS.filter(u => u.username.startsWith(query.toLowerCase())) : [],
  }))
})

describe('UserPicker', () => {
  it('focuses the search field even when a frame fires before the modal content renders', async () => {
    // PatternFly renders the content one state update after isOpen turns true. On a page
    // that is slow to re-render, the next animation frame arrives before that update.
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    try {
      const { search } = await openPicker()
      expect(document.activeElement).toBe(search)
    } finally {
      raf.mockRestore()
    }
  })

  it('keeps focus in the search field under StrictMode', async () => {
    // main.tsx uses StrictMode. Its simulated unmount runs PF FocusTrap's cleanup, which
    // returns focus to the previously active element right after the content mounts.
    render(
      <StrictMode>
        <UserPicker label="Pick" title="Pick a person" onSelect={vi.fn()} />
      </StrictMode>,
    )
    const trigger = screen.getByRole('button', { name: 'Pick' })
    trigger.focus()
    fireEvent.click(trigger)

    const search = await screen.findByRole('combobox')
    expect(document.activeElement).toBe(search)
  })

  it('focuses the search field when reopened during the close animation', async () => {
    const { trigger, search } = await openPicker()

    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search.isConnected).toBe(true)
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole('combobox')).toBe(search)
    expect(document.activeElement).toBe(search)
  })

  it('stays closed and does not search until opened', () => {
    render(<UserPicker label="Pick" title="Pick a person" onSelect={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mockUseUserSearch).toHaveBeenLastCalledWith('', false, undefined)
  })

  it('passes the role filter to the user search', async () => {
    await openPicker({ userRole: 'sec_team' })
    expect(mockUseUserSearch).toHaveBeenLastCalledWith('', true, 'sec_team')
  })

  it('selects the highlighted user on Enter, closes, and returns focus to the trigger', async () => {
    const { onSelect, trigger, search } = await openPicker()

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(USERS[1])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('does not select twice when Enter repeats during the close animation', async () => {
    // A disabled query keeps its cached results, so the list is still populated while closing.
    mockUseUserSearch.mockImplementation(() => ({ isLoading: false, data: USERS }))
    const { onSelect, search } = await openPicker()

    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape without selecting and returns focus to the trigger', async () => {
    const { onSelect, trigger, search } = await openPicker()

    fireEvent.keyDown(search, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onSelect).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('starts empty again after being reopened', async () => {
    const { trigger, search } = await openPicker()
    fireEvent.change(search, { target: { value: 'ali' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)

    fireEvent.keyDown(search, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(trigger)
    const reopened = await screen.findByRole('combobox')
    expect((reopened as HTMLInputElement).value).toBe('')
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('does not open while aria-disabled', () => {
    render(<UserPicker label="Pick" title="Pick a person" onSelect={vi.fn()} isAriaDisabled />)
    fireEvent.click(screen.getByRole('button', { name: 'Pick' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
