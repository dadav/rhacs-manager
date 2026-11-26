import { useCallback, useEffect, useReducer, useRef, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activityKeys,
  fetchActivityPage,
  type ActivityEvent,
  type ActivityFeedPage,
  type CollectorStatus,
} from '../../api/activity'
import { ApiRequestError } from '../../api/client'
import { isSessionExpired, SessionExpiredError, subscribeSessionExpired } from '../../utils/sessionExpiry'

export const ACTIVITY_POLL_INTERVAL_MS = 5_000
export const ACTIVITY_PAGE_LIMIT = 100
export const ACTIVITY_MAX_ROWS = 500

/**
 * Feed state for one generation. A generation ends on scope/user change,
 * collapse, session expiry, or "clear display"; responses carry the generation
 * they were requested for and are dropped when it is no longer current.
 */
export interface FeedState {
  generation: number
  /** Everything whose change starts a new generation (user, cluster, namespace, open, expired). */
  identity: string
  rows: ActivityEvent[]
  cursor: string | null
  scopeKey: string | null
  initialLoaded: boolean
  collectorStatus: CollectorStatus | null
  lastSuccessAt: string | null
  truncated: boolean
  /** Requests were disabled with retained rows; hide them until the server confirms the scope. */
  needsScopeConfirm: boolean
  /** After "clear display": the next tail only syncs cursor/status, its rows are discarded. */
  suppressRows: boolean
  /** Rows appended by the latest accepted page (bounded live announcement). */
  appendedCount: number
  appendedSerial: number
}

export type FeedAction =
  | { type: 'reset'; identity: string; suppressRows: boolean }
  | { type: 'page'; generation: number; requestCursor: string | null; page: ActivityFeedPage }
  | { type: 'suspend' }
  | { type: 'dropCursor'; generation: number }

export function initialFeedState(identity: string): FeedState {
  return freshState(0, identity, false)
}

function freshState(generation: number, identity: string, suppressRows: boolean): FeedState {
  return {
    generation,
    identity,
    rows: [],
    cursor: null,
    scopeKey: null,
    initialLoaded: false,
    collectorStatus: null,
    lastSuccessAt: null,
    truncated: false,
    needsScopeConfirm: false,
    suppressRows,
    appendedCount: 0,
    appendedSerial: 0,
  }
}

function capRows(rows: ActivityEvent[]): { rows: ActivityEvent[]; dropped: boolean } {
  if (rows.length <= ACTIVITY_MAX_ROWS) return { rows, dropped: false }
  return { rows: rows.slice(rows.length - ACTIVITY_MAX_ROWS), dropped: true }
}

function acceptPage(state: FeedState, page: ActivityFeedPage): FeedState {
  const common = {
    cursor: page.next_cursor,
    scopeKey: page.scope_key,
    collectorStatus: page.collector_status,
    lastSuccessAt: page.last_success_at,
    initialLoaded: true,
    needsScopeConfirm: false,
  }
  if (state.suppressRows) {
    return { ...state, ...common, rows: [], truncated: false, suppressRows: false, appendedCount: 0 }
  }
  // Never append across an authorization scope change: the server's tail replaces the buffer.
  const replace = state.cursor === null || page.reset || page.scope_key !== state.scopeKey
  if (replace) {
    const capped = capRows(page.items)
    return { ...state, ...common, rows: capped.rows, truncated: capped.dropped, appendedCount: 0 }
  }
  const known = new Set(state.rows.map(row => row.id))
  const added = page.items.filter(row => !known.has(row.id))
  if (added.length === 0) return { ...state, ...common }
  const capped = capRows([...state.rows, ...added])
  return {
    ...state,
    ...common,
    rows: capped.rows,
    truncated: state.truncated || capped.dropped,
    appendedCount: added.length,
    appendedSerial: state.appendedSerial + 1,
  }
}

export function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'reset':
      return freshState(state.generation + 1, action.identity, action.suppressRows)
    case 'page':
      // A response is only valid for the generation and cursor it was requested with. A
      // request built from an older render (e.g. a poll racing the previous page) is dropped;
      // the next poll repeats it from the current cursor.
      if (action.generation !== state.generation || action.requestCursor !== state.cursor) return state
      return acceptPage(state, action.page)
    case 'suspend':
      return state.initialLoaded ? { ...state, needsScopeConfirm: true } : state
    case 'dropCursor':
      // The server rejected the cursor: the next request loads a fresh tail that replaces the rows.
      return action.generation === state.generation ? { ...state, cursor: null } : state
  }
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== 'hidden',
    () => true,
  )
}

function useSessionExpired(): boolean {
  return useSyncExternalStore(subscribeSessionExpired, isSessionExpired, isSessionExpired)
}

function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export interface ActivityFeedOptions {
  open: boolean
  paused: boolean
  userId: string | undefined
  cluster?: string
  namespace?: string
  pollIntervalMs?: number
}

export interface ActivityFeed {
  rows: ActivityEvent[]
  initialLoaded: boolean
  isLoading: boolean
  requestsEnabled: boolean
  collectorStatus: CollectorStatus | null
  lastSuccessAt: string | null
  truncated: boolean
  error: unknown
  appendedCount: number
  appendedSerial: number
  clear: () => void
}

export function useActivityFeed({
  open,
  paused,
  userId,
  cluster,
  namespace,
  pollIntervalMs = ACTIVITY_POLL_INTERVAL_MS,
}: ActivityFeedOptions): ActivityFeed {
  const queryClient = useQueryClient()
  const pageVisible = usePageVisible()
  const sessionExpired = useSessionExpired()
  const identity = JSON.stringify([userId ?? null, cluster ?? null, namespace ?? null, open, sessionExpired])
  const [state, dispatch] = useReducer(feedReducer, identity, initialFeedState)

  // Render-phase reset: no frame ever shows rows of a previous user/scope.
  if (state.identity !== identity) {
    dispatch({ type: 'reset', identity, suppressRows: false })
  }
  const current = state.identity === identity ? state : freshState(state.generation + 1, identity, false)

  const enabled = open && !paused && pageVisible && !sessionExpired && !!userId
  const generation = current.generation
  const startCursor = current.cursor

  const query = useQuery({
    queryKey: activityKeys.feed(userId ?? '', cluster, namespace, generation),
    queryFn: async ({ signal }) => {
      let cursor = startCursor
      while (!signal.aborted) {
        let page: ActivityFeedPage
        try {
          page = await fetchActivityPage({ cluster, namespace, cursor, limit: ACTIVITY_PAGE_LIMIT }, signal)
        } catch (error) {
          if (cursor !== null && error instanceof ApiRequestError && error.status === 400) {
            dispatch({ type: 'dropCursor', generation })
          }
          throw error
        }
        if (signal.aborted) break
        dispatch({ type: 'page', generation, requestCursor: cursor, page })
        cursor = page.next_cursor
        if (!page.has_more) break
        await yieldToBrowser()
      }
      return { generation, cursor }
    },
    enabled,
    refetchInterval: enabled ? pollIntervalMs : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  // Requests disabled (pause, hidden tab, collapse, expiry): cancel in-flight work.
  const wasEnabled = useRef(enabled)
  useEffect(() => {
    if (wasEnabled.current && !enabled) {
      void queryClient.cancelQueries({ queryKey: activityKeys.all })
      dispatch({ type: 'suspend' })
    }
    wasEnabled.current = enabled
  }, [enabled, queryClient])

  const clear = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: activityKeys.all })
    dispatch({ type: 'reset', identity, suppressRows: true })
  }, [identity, queryClient])

  const rowsHidden = current.needsScopeConfirm && enabled
  const error = query.error instanceof SessionExpiredError ? null : query.error

  return {
    rows: rowsHidden ? [] : current.rows,
    initialLoaded: current.initialLoaded && !rowsHidden,
    isLoading: enabled && (!current.initialLoaded || rowsHidden),
    requestsEnabled: enabled,
    collectorStatus: current.collectorStatus,
    lastSuccessAt: current.lastSuccessAt,
    truncated: current.truncated,
    error,
    appendedCount: current.appendedCount,
    appendedSerial: current.appendedSerial,
    clear,
  }
}
