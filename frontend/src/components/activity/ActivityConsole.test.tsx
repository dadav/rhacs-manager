import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import i18n from '../../i18n'
import type { ActivityEvent, ActivityFeedPage } from '../../api/activity'
import { resetSessionExpiredForTests } from '../../utils/sessionExpiry'
import {
  ACTIVITY_KIND_GLYPHS,
  ACTIVITY_PANEL_ID,
  ActivityConsoleDrawer,
  ActivityConsoleToggle,
  describeActivity,
  rowScopeText,
} from './ActivityConsole'

let events: ActivityEvent[] = []
const paths: string[] = []

function scanEvent(id: number): ActivityEvent {
  return {
    id: String(id),
    kind: id % 2 ? 'image_scanned' : 'image_scan_updated',
    observed_at: '2026-11-25T12:00:10Z',
    source_at: '2026-11-25T12:00:06Z',
    cluster_name: 'cluster-a',
    namespace: 'payments',
    details: {
      image_id_v2: `img-${id}`,
      image_digest: 'sha256:abc',
      image_name: `registry.example/payments:${id}`,
      component_count: 42,
      cve_count: 3,
      fixable_cve_count: 1,
    },
  }
}

const apiGet = vi.fn(async (path: string): Promise<ActivityFeedPage> => {
  paths.push(path)
  const params = new URLSearchParams(path.split('?')[1])
  const after = Number(params.get('cursor') ?? '-1')
  const items = params.get('cursor') ? events.filter(e => Number(e.id) > after) : events.slice(-100)
  const high = events.length ? Number(events[events.length - 1].id) : 0
  return {
    items,
    next_cursor: String(high),
    has_more: false,
    reset: false,
    scope_key: 'scope',
    last_success_at: '2026-11-25T12:00:10Z',
    collector_status: 'stale',
  }
})

vi.mock('../../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, api: { get: (path: string) => apiGet(path) } }
})

function Harness({ pollIntervalMs = 40 }: { pollIntervalMs?: number }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <ActivityConsoleToggle isOpen={open} onToggle={() => setOpen(v => !v)} buttonRef={toggleRef} />
      <ActivityConsoleDrawer
        isOpen={open}
        onClose={() => {
          setOpen(false)
          toggleRef.current?.focus()
        }}
        userId="user-1"
        pollIntervalMs={pollIntervalMs}
      >
        <Routes>
          <Route path="/a" element={<Link to="/b">to b</Link>} />
          <Route path="/b" element={<Link to="/b?ignore_thresholds=1">ignore thresholds</Link>} />
        </Routes>
      </ActivityConsoleDrawer>
    </>
  )
}

function renderConsole(pollIntervalMs?: number, initialEntry = '/a') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Harness pollIntervalMs={pollIntervalMs} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const toggleButton = () => screen.getByRole('button', { name: 'Activity console' })
const initialCalls = () => paths.filter(p => !p.includes('cursor=')).length

beforeEach(async () => {
  events = [scanEvent(1), scanEvent(2)]
  paths.length = 0
  apiGet.mockClear()
  resetSessionExpiredForTests()
  await i18n.changeLanguage('en')
})

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('ActivityConsole', () => {
  it('starts closed and makes no request until opened', async () => {
    renderConsole()
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
    expect(toggleButton()).toHaveAttribute('aria-controls', ACTIVITY_PANEL_ID)
    await act(() => new Promise(resolve => setTimeout(resolve, 120)))
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('opens with focus on the heading, shows rows, and returns focus on close', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
    const heading = await screen.findByRole('heading', { name: 'ACS activity' })
    await waitFor(() => expect(heading).toHaveFocus())

    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText('Scan completed')
    expect(within(log).getByText('Scan result changed')).toBeInTheDocument()
    expect(within(log).getAllByText('cluster-a/payments')).toHaveLength(2)
    expect(screen.getByText('Collection delayed')).toBeInTheDocument()
    expect(screen.getByText('All namespaces you can access')).toBeInTheDocument()
    expect(screen.getByRole('separator', { name: 'Resize activity console' })).toBeInTheDocument()
    expect(initialCalls()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close activity console' }))
    expect(toggleButton()).toHaveFocus()
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps rows across navigation and threshold-only URL changes', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText('Scan completed')

    fireEvent.click(screen.getByRole('link', { name: 'to b' }))
    fireEvent.click(await screen.findByRole('link', { name: 'ignore thresholds' }))
    events.push(scanEvent(3))
    await waitFor(() => expect(within(log).getAllByText('cluster-a/payments')).toHaveLength(3))
    expect(initialCalls()).toBe(1)
  })

  it('focuses the heading when reopened before the closing transition finishes', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    const heading = await screen.findByRole('heading', { name: 'ACS activity' })
    await waitFor(() => expect(heading).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Close activity console' }))
    expect(toggleButton()).toHaveFocus()
    fireEvent.click(toggleButton())

    await waitFor(() => expect(screen.getByRole('heading', { name: 'ACS activity' })).toHaveFocus())
  })

  it('prevents focus from scrolling the page during opening and rapid reopening', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    try {
      renderConsole()
      for (let opening = 0; opening < 2; opening++) {
        focus.mockClear()
        fireEvent.click(toggleButton())
        const heading = await screen.findByRole('heading', { name: 'ACS activity' })
        await waitFor(() => expect(heading).toHaveFocus())
        const headingCalls = focus.mock.calls.filter((_, index) => focus.mock.contexts[index] === heading)
        expect(headingCalls.length).toBeGreaterThan(0)
        expect(headingCalls.every(([options]) => options?.preventScroll === true)).toBe(true)
        fireEvent.click(screen.getByRole('button', { name: 'Close activity console' }))
      }
    } finally {
      focus.mockRestore()
    }
  })

  it('renders event text as plain text and relabels on language change without reloading', async () => {
    events = [{ ...scanEvent(1), details: { ...scanEvent(1).details, image_name: '<img src=x onerror=alert(1)>' } }]
    renderConsole()
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText(/<img src=x onerror=alert\(1\)>/)
    expect(log.querySelector('img')).toBeNull()

    await act(() => i18n.changeLanguage('de'))
    expect(await within(log).findByText('Scan abgeschlossen')).toBeInTheDocument()
    expect(initialCalls()).toBe(1)
  })

  it('offers a jump to the latest rows while the reader is scrolled up', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText('Scan completed')

    Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 200 })
    log.scrollTop = 100
    fireEvent.scroll(log)
    events.push(scanEvent(3), scanEvent(4))

    const jump = await screen.findByRole('button', { name: '2 new events, jump to latest' })
    expect(log.scrollTop).toBe(100)
    expect(screen.getByText('2 new events')).toBeInTheDocument()
    fireEvent.click(jump)
    expect(screen.queryByRole('button', { name: /jump to latest/ })).toBeNull()
  })

  it('pause stops requests and clear empties the display', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText('Scan completed')

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByText('Paused')).toBeInTheDocument()
    const before = apiGet.mock.calls.length
    await act(() => new Promise(resolve => setTimeout(resolve, 150)))
    expect(apiGet.mock.calls.length).toBe(before)

    fireEvent.click(screen.getByRole('button', { name: 'Clear display' }))
    expect(within(log).queryByText('Scan completed')).toBeNull()
    expect(within(log).getByText('Display cleared. New activity appears here.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    await act(() => new Promise(resolve => setTimeout(resolve, 150)))
    expect(within(log).queryByText('Scan completed')).toBeNull()
  })

  it('marks each kind with a decorative glyph and a blinking cursor only while live', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    const label = await within(log).findByText('Scan completed')
    const glyph = label.parentElement?.querySelector('.activity-console__glyph')
    expect(glyph).toHaveTextContent(ACTIVITY_KIND_GLYPHS.image_scanned)
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
    // Fixture collector status is "stale": solid cursor, no blink class.
    expect(log.querySelector('.activity-console__cursor--stale')).not.toBeNull()
    expect(log.querySelector('.activity-console__cursor--live')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(log.querySelector('.activity-console__cursor--paused')).not.toBeNull()
  })

  it('omits the scope column when the sidebar fixes cluster and namespace', async () => {
    renderConsole(undefined, '/a?cluster=cluster-a&ns=payments')
    fireEvent.click(toggleButton())
    const log = await screen.findByRole('log', { name: 'Activity events' })
    await within(log).findByText('Scan completed')
    expect(log).toHaveClass('activity-console__log--no-scope')
    expect(log.querySelector('.activity-console__scope')).toBeNull()
    expect(screen.getByText('cluster-a / payments')).toBeInTheDocument()
  })

  it('explains the sampling in a popover instead of a permanent note', async () => {
    renderConsole()
    fireEvent.click(toggleButton())
    await screen.findByRole('log', { name: 'Activity events' })
    expect(screen.queryByText(/ACS is sampled about every 10 seconds/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'About this data' }))
    expect(await screen.findByText(/ACS is sampled about every 10 seconds/)).toBeInTheDocument()
  })
})

describe('describeActivity', () => {
  const t = i18n.t.bind(i18n)
  const format = () => 'TIME'

  it('describes image changes with unavailable fields', () => {
    const text = describeActivity(
      t,
      {
        id: '1',
        kind: 'deployment_images_changed',
        observed_at: '2026-11-25T12:00:10Z',
        source_at: null,
        cluster_name: 'c',
        namespace: 'n',
        details: {
          deployment_id: 'd1',
          deployment_name: 'api',
          added_images: [{ image_id_v2: null, image_digest: 'sha256:0123456789abcdef0123', image_name: null }],
          removed_images: [],
        },
      },
      format,
    )
    expect(text).toEqual({ lead: null, body: 'Deployment api: added sha256:0123456789ab…; removed none', meta: null })
  })

  it('leads scans with the image, distinguishes missing counts, and keeps the ACS scan time as meta', () => {
    const event = scanEvent(1)
    if (event.kind !== 'image_scanned') throw new Error('fixture')
    const text = describeActivity(t, { ...event, details: { ...event.details, cve_count: null } }, format)
    expect(text).toEqual({
      lead: 'registry.example/payments:1',
      body: '? CVEs (1 fixable), 42 components',
      meta: 'ACS scan time TIME',
    })
  })
})

describe('rowScopeText', () => {
  const event = scanEvent(1)

  it('shows only the part the sidebar scope leaves open', () => {
    expect(rowScopeText(event)).toBe('cluster-a/payments')
    expect(rowScopeText(event, 'cluster-a')).toBe('payments')
    expect(rowScopeText(event, undefined, 'payments')).toBe('cluster-a')
    expect(rowScopeText(event, 'cluster-a', 'payments')).toBeNull()
  })
})
