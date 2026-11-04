import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { WhatsNewLink } from './WhatsNew'
import { LAST_SEEN_STORAGE_KEY } from '../releases/releaseNotes'
import { installMemoryStorage } from '../test/memoryStorage'
import de from '../releases/releases.de.json'
import en from '../releases/releases.en.json'

// --- Mocks ---

let mockLanguage = 'en'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.version !== undefined ? `${key}:${opts.version}` : key),
    i18n: { language: mockLanguage },
  }),
}))

// --- Fixtures from the real content files ---

// Second-newest entry as the running version, so the newest one counts as "future" notes.
const NEWER = en.releases[0]
const CURRENT = en.releases[1]
const OLDER = en.releases[2]
const CURRENT_DE = de.releases[1]

let storage: Storage

beforeEach(() => {
  mockLanguage = 'en'
  storage = installMemoryStorage()
})

function openModal() {
  fireEvent.click(screen.getByRole('button', { name: /whatsNew\.label/ }))
  return screen.getByRole('dialog', { name: `whatsNew.title:${CURRENT.version}` })
}

describe('WhatsNewLink', () => {
  it('shows the dot until opened and stores the running version', () => {
    render(<WhatsNewLink currentVersion={CURRENT.version} />)
    expect(screen.getByTestId('whats-new-dot')).toBeInTheDocument()
    expect(screen.getByText(/whatsNew\.newIndicator/)).toBeInTheDocument()

    openModal()

    expect(screen.queryByTestId('whats-new-dot')).not.toBeInTheDocument()
    expect(storage.getItem(LAST_SEEN_STORAGE_KEY)).toBe(CURRENT.version)
  })

  it('shows no dot when the running version was already seen', () => {
    storage.setItem(LAST_SEEN_STORAGE_KEY, CURRENT.version)
    render(<WhatsNewLink currentVersion={CURRENT.version} />)
    expect(screen.queryByTestId('whats-new-dot')).not.toBeInTheDocument()
  })

  it('lists the running release, collapses older ones and hides newer ones', () => {
    render(<WhatsNewLink currentVersion={CURRENT.version} />)
    const dialog = openModal()

    const currentSection = within(dialog).getByRole('region', { name: `v${CURRENT.version}` })
    for (const item of CURRENT.items) expect(within(currentSection).getByText(item.text)).toBeVisible()
    expect(within(dialog).queryByText(NEWER.items[0].text)).not.toBeInTheDocument()
    expect(within(dialog).queryByText(`v${NEWER.version} (${NEWER.date})`)).not.toBeInTheDocument()

    const olderToggle = within(dialog).getByRole('button', { name: `v${OLDER.version} (${OLDER.date})` })
    expect(olderToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(olderToggle)
    expect(olderToggle).toHaveAttribute('aria-expanded', 'true')
    const olderContent = document.getElementById(olderToggle.getAttribute('aria-controls') ?? '')
    expect(olderContent).not.toBeNull()
    expect(within(olderContent as HTMLElement).getByText(OLDER.items[0].text)).toBeVisible()

    expect(within(dialog).getByRole('link', { name: 'whatsNew.viewOnGithub' })).toHaveAttribute(
      'href',
      `https://github.com/dadav/rhacs-manager/releases/tag/v${CURRENT.version}`,
    )
  })

  it('closes via the footer button and via Escape', async () => {
    render(<WhatsNewLink currentVersion={CURRENT.version} />)

    openModal()
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    // PF keeps the modal mounted until its close animation (or fallback timer) ends.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const dialog = openModal()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows an info alert and no dot for a version without notes', () => {
    render(<WhatsNewLink currentVersion="999.0.0" />)
    expect(screen.queryByTestId('whats-new-dot')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /whatsNew\.label/ }))
    const dialog = screen.getByRole('dialog', { name: 'whatsNew.title:999.0.0' })
    expect(within(dialog).getByText('whatsNew.noNotesForVersion')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: `v${NEWER.version} (${NEWER.date})` })).toBeInTheDocument()
  })

  it('follows the current language', () => {
    const { rerender } = render(<WhatsNewLink currentVersion={CURRENT.version} />)
    const dialog = openModal()
    const currentSection = () => within(dialog).getByRole('region', { name: `v${CURRENT.version}` })
    expect(within(currentSection()).getByText(CURRENT.items[0].text)).toBeInTheDocument()

    mockLanguage = 'de'
    rerender(<WhatsNewLink currentVersion={CURRENT.version} />)
    expect(within(currentSection()).getByText(CURRENT_DE.items[0].text)).toBeInTheDocument()
    expect(within(currentSection()).queryByText(CURRENT.items[0].text)).not.toBeInTheDocument()
  })
})
