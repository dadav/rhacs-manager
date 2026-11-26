import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ActivityEvent, ActivityFeedPage } from '../../api/activity'
import { ApiRequestError } from '../../api/client'
import { markSessionExpired, resetSessionExpiredForTests, SessionExpiredError } from '../../utils/sessionExpiry'
import { ACTIVITY_MAX_ROWS, feedReducer, initialFeedState, useActivityFeed, type ActivityFeedOptions } from './useActivityFeed'

// --- Simulated feed server: cursor "after:<id>", scope key per (user, cluster, namespace). ---

interface Call {
  cursor: string | null
  cluster: string | null
  namespace: string | null
  signal: AbortSignal | undefined
  gated: boolean
}

let events: ActivityEvent[] = []
let calls: Call[] = []
let scopeSuffix = ''
let gate: Promise<void> | null = null
let failNext: Error | null = null

function makeEvent(id: number, namespace = 'payments', cluster = 'cluster-a'): ActivityEvent {
  return {
    id: String(id),
    kind: 'deployment_observed',
    observed_at: '2026-11-25T12:00:00Z',
    source_at: null,
    cluster_name: cluster,
    namespace,
    details: { deployment_id: `dep-${id}`, deployment_name: `dep-${id}` },
  }
}

function addEvents(from: number, to: number, namespace = 'payments') {
  for (let id = from; id <= to; id++) events.push(makeEvent(id, namespace))
}

function serve(params: URLSearchParams): ActivityFeedPage {
  const cluster = params.get('cluster')
  const namespace = params.get('namespace')
  const limit = Number(params.get('limit'))
  const scopeKey = `scope:${cluster ?? '*'}:${namespace ?? '*'}${scopeSuffix}`
  const visible = events.filter(e => (!cluster || e.cluster_name === cluster) && (!namespace || e.namespace === namespace))
  const high = events.length ? Number(events[events.length - 1].id) : 0
  const base = { scope_key: scopeKey, last_success_at: '2026-11-25T12:00:00Z', collector_status: 'live' as const }
  const cursor = params.get('cursor')
  const [cursorScope, cursorAfter] = cursor ? cursor.split('|') : [null, null]
  if (!cursor || cursorScope !== scopeKey) {
    return { ...base, items: visible.slice(-limit), next_cursor: `${scopeKey}|${high}`, has_more: false, reset: !!cursor }
  }
  const after = Number(cursorAfter)
  const newer = visible.filter(e => Number(e.id) > after)
  const items = newer.slice(0, limit)
  const hasMore = newer.length > limit
  const next = hasMore ? Number(items[items.length - 1].id) : high
  return { ...base, items, next_cursor: `${scopeKey}|${next}`, has_more: hasMore, reset: false }
}

const apiGet = vi.fn(async (path: string, init?: RequestInit) => {
  const params = new URLSearchParams(path.split('?')[1])
  calls.push({
    cursor: params.get('cursor'),
    cluster: params.get('cluster'),
    namespace: params.get('namespace'),
    signal: init?.signal ?? undefined,
    gated: gate !== null,
  })
  if (gate) {
    const current = gate
    await new Promise<void>((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      void current.then(resolve)
    })
  }
  if (failNext) {
    const error = failNext
    failNext = null
    throw error
  }
  return serve(params)
})

vi.mock('../../api/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../api/client')>()
  return { ...actual, api: { get: (path: string, init?: RequestInit) => apiGet(path, init) } }
})

// --- Harness ---------------------------------------------------------------------

const POLL_MS = 40

function setup(initial: Partial<ActivityFeedOptions> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  let props: ActivityFeedOptions = { open: false, paused: false, userId: 'user-1', pollIntervalMs: POLL_MS, ...initial }
  const hook = renderHook((p: ActivityFeedOptions) => useActivityFeed(p), { wrapper, initialProps: props })
  const update = (next: Partial<ActivityFeedOptions>) => {
    props = { ...props, ...next }
    hook.rerender(props)
  }
  return { ...hook, update, queryClient }
}

const ids = (rows: ActivityEvent[]) => rows.map(r => Number(r.id))
const sleep = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

beforeEach(() => {
  events = []
  calls = []
  scopeSuffix = ''
  gate = null
  failNext = null
  apiGet.mockClear()
  resetSessionExpiredForTests()
  setVisibility('visible')
})

afterEach(() => {
  resetSessionExpiredForTests()
})

describe('useActivityFeed', () => {
  it('makes no request while closed', async () => {
    addEvents(1, 3)
    const { result } = setup()
    await sleep(POLL_MS * 4)
    expect(calls).toHaveLength(0)
    expect(result.current.rows).toEqual([])
    expect(result.current.requestsEnabled).toBe(false)
  })

  it('loads the recent tail once on open, then polls incrementally', async () => {
    addEvents(1, 150)
    const { result, update } = setup()
    update({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    expect(ids(result.current.rows)).toEqual(Array.from({ length: 100 }, (_, i) => 51 + i))
    expect(calls[0].cursor).toBeNull()

    addEvents(151, 152)
    await waitFor(() => expect(ids(result.current.rows).slice(-2)).toEqual([151, 152]))
    expect(calls.filter(c => c.cursor === null)).toHaveLength(1)
    expect(calls[1].cursor).toBe('scope:*:*|150')
    expect(result.current.appendedCount).toBe(2)
    expect(result.current.collectorStatus).toBe('live')
  })

  it('catches up through several pages, deduplicates, and caps the buffer at 500', async () => {
    addEvents(1, 10)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))

    addEvents(11, 700)
    await waitFor(() => expect(ids(result.current.rows).at(-1)).toBe(700))
    const rows = ids(result.current.rows)
    expect(rows).toHaveLength(ACTIVITY_MAX_ROWS)
    expect(rows[0]).toBe(201)
    expect(new Set(rows).size).toBe(rows.length)
    expect(result.current.truncated).toBe(true)
    // Catch-up pages follow each other with the advancing cursor, never with offsets.
    const cursors = calls.map(c => c.cursor).filter((c, i, all) => c !== all[i - 1])
    const start = cursors.indexOf('scope:*:*|10')
    expect(cursors.slice(start, start + 4)).toEqual(['scope:*:*|10', 'scope:*:*|110', 'scope:*:*|210', 'scope:*:*|310'])
  })

  it('pause stops polling and keeps rows; resume catches up from the cursor', async () => {
    addEvents(1, 5)
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    update({ paused: true })
    const before = calls.length
    addEvents(6, 8)
    await sleep(POLL_MS * 4)
    expect(calls.length).toBe(before)
    expect(ids(result.current.rows)).toEqual([1, 2, 3, 4, 5])

    update({ paused: false })
    await waitFor(() => expect(ids(result.current.rows)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]))
    expect(calls[before].cursor).toBe('scope:*:*|5')
  })

  it('finishes catch-up beyond twenty pages before waiting for the polling interval', async () => {
    addEvents(1, 1)
    const { result, update } = setup({ open: true, pollIntervalMs: 60_000 })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    update({ paused: true })
    addEvents(2, 2102)
    update({ paused: false })

    await waitFor(() => expect(ids(result.current.rows).at(-1)).toBe(2102))
    expect(result.current.rows).toHaveLength(ACTIVITY_MAX_ROWS)
  })

  it('pause aborts an in-flight request and ignores its late response', async () => {
    addEvents(1, 2)
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    let release!: () => void
    gate = new Promise(resolve => {
      release = resolve
    })
    addEvents(3, 3)
    await waitFor(() => expect(calls.some(c => c.gated)).toBe(true))
    const inFlight = calls.find(c => c.gated)!
    update({ paused: true })
    await waitFor(() => expect(inFlight.signal?.aborted).toBe(true))
    release()
    gate = null
    await sleep(POLL_MS * 2)
    expect(ids(result.current.rows)).toEqual([1, 2])
  })

  it('collapse clears the buffer and reopening loads a fresh tail', async () => {
    addEvents(1, 3)
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    update({ open: false })
    expect(result.current.rows).toEqual([])
    const before = calls.length
    await sleep(POLL_MS * 3)
    expect(calls.length).toBe(before)

    addEvents(4, 4)
    update({ open: true })
    await waitFor(() => expect(ids(result.current.rows)).toEqual([1, 2, 3, 4]))
    expect(calls[before].cursor).toBeNull()
  })

  it('hidden tab stops polling and hides retained rows until the scope is confirmed', async () => {
    addEvents(1, 2)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    setVisibility('hidden')
    const before = calls.length
    addEvents(3, 4)
    await sleep(POLL_MS * 4)
    expect(calls.length).toBe(before)

    let release!: () => void
    gate = new Promise(resolve => {
      release = resolve
    })
    setVisibility('visible')
    await waitFor(() => expect(calls.length).toBe(before + 1))
    // Retained rows stay hidden while the first re-enabled response is pending.
    expect(result.current.rows).toEqual([])
    expect(calls[before].cursor).toBe('scope:*:*|2')
    release()
    gate = null
    await waitFor(() => expect(ids(result.current.rows)).toEqual([1, 2, 3, 4]))
  })

  it('a server scope reset replaces rows instead of appending', async () => {
    addEvents(1, 3)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    // Permissions changed server-side: the next response belongs to another scope.
    scopeSuffix = ':revoked'
    events = [makeEvent(10, 'billing')]
    await waitFor(() => expect(ids(result.current.rows)).toEqual([10]))
    expect(result.current.rows.every(r => r.namespace === 'billing')).toBe(true)
  })

  it('scope change clears immediately and drops a late response from the old scope', async () => {
    addEvents(1, 2)
    events.push(makeEvent(3, 'billing'))
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    let release!: () => void
    gate = new Promise(resolve => {
      release = resolve
    })
    addEvents(4, 4)
    await waitFor(() => expect(calls.some(c => c.gated)).toBe(true))
    const oldRequest = calls.find(c => c.gated)!

    update({ namespace: 'billing' })
    expect(result.current.rows).toEqual([])
    await waitFor(() => expect(oldRequest.signal?.aborted).toBe(true))
    release()
    gate = null
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    expect(ids(result.current.rows)).toEqual([3])
    expect(calls.at(-1)?.namespace).toBe('billing')
  })

  it('user change clears rows and starts a new generation', async () => {
    addEvents(1, 2)
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    const before = calls.length
    update({ userId: 'user-2' })
    expect(result.current.rows).toEqual([])
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    expect(calls[before].cursor).toBeNull()
  })

  it('clear display discards rows, syncs the cursor once, and never refills old history', async () => {
    addEvents(1, 5)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    const before = calls.length
    act(() => result.current.clear())
    expect(result.current.rows).toEqual([])
    await waitFor(() => expect(calls.length).toBeGreaterThan(before))
    expect(calls[before].cursor).toBeNull()
    await sleep(POLL_MS * 3)
    expect(result.current.rows).toEqual([])

    addEvents(6, 7)
    await waitFor(() => expect(ids(result.current.rows)).toEqual([6, 7]))
  })

  it('clear while paused empties immediately and defers the cursor sync until resume', async () => {
    addEvents(1, 5)
    const { result, update } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    update({ paused: true })
    act(() => result.current.clear())
    expect(result.current.rows).toEqual([])
    const before = calls.length
    await sleep(POLL_MS * 3)
    expect(calls.length).toBe(before)

    update({ paused: false })
    await waitFor(() => expect(calls.length).toBeGreaterThan(before))
    expect(calls[before].cursor).toBeNull()
    await sleep(POLL_MS * 2)
    expect(result.current.rows).toEqual([])
  })

  it('ordinary API errors keep rows and retry on the next interval', async () => {
    addEvents(1, 2)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    failNext = new ApiRequestError(503, 'Service unavailable')
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(ids(result.current.rows)).toEqual([1, 2])
    expect(result.current.collectorStatus).toBe('live')

    addEvents(3, 3)
    await waitFor(() => expect(ids(result.current.rows)).toEqual([1, 2, 3]))
    expect(result.current.error).toBeNull()
  })

  it('an invalid cursor makes the next request load a fresh tail', async () => {
    addEvents(1, 2)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    failNext = new ApiRequestError(400, 'Invalid activity feed position')
    await waitFor(() => expect(result.current.error).toBeTruthy())
    const failedAt = calls.length
    await waitFor(() => expect(calls.length).toBeGreaterThan(failedAt))
    expect(calls[failedAt].cursor).toBeNull()
  })

  it('session expiry aborts, clears rows, and stops polling for good', async () => {
    addEvents(1, 2)
    const { result } = setup({ open: true })
    await waitFor(() => expect(result.current.initialLoaded).toBe(true))
    failNext = new SessionExpiredError()
    act(() => markSessionExpired())
    expect(result.current.rows).toEqual([])
    expect(result.current.requestsEnabled).toBe(false)
    const before = calls.length
    await sleep(POLL_MS * 4)
    expect(calls.length).toBe(before)
    expect(result.current.error).toBeNull()
  })
})

describe('feedReducer', () => {
  const page = (items: ActivityEvent[], next: string): ActivityFeedPage => ({
    items,
    next_cursor: next,
    has_more: false,
    reset: false,
    scope_key: 'scope-a',
    last_success_at: null,
    collector_status: 'live',
  })

  it('drops a response requested with an outdated cursor', () => {
    let state = initialFeedState('id')
    state = feedReducer(state, { type: 'page', generation: 0, requestCursor: null, page: page([makeEvent(1)], 'c1') })
    expect(state.cursor).toBe('c1')
    // A late request still built with cursor=null must not append the old tail again.
    const stale = feedReducer(state, { type: 'page', generation: 0, requestCursor: null, page: page([makeEvent(0)], 'c0') })
    expect(stale).toBe(state)
    const fresh = feedReducer(state, { type: 'page', generation: 0, requestCursor: 'c1', page: page([makeEvent(2)], 'c2') })
    expect(ids(fresh.rows)).toEqual([1, 2])
  })

  it('drops a response from an older generation', () => {
    const state = feedReducer(initialFeedState('id'), { type: 'reset', identity: 'id', suppressRows: false })
    const next = feedReducer(state, { type: 'page', generation: 0, requestCursor: null, page: page([makeEvent(1)], 'c1') })
    expect(next).toBe(state)
  })
})
