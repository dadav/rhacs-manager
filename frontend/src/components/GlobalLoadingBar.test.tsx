import { act, cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GlobalLoadingBar } from './GlobalLoadingBar'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

let client: QueryClient

beforeEach(() => {
  vi.useFakeTimers()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  cleanup()
  client.clear()
  vi.useRealTimers()
})

function renderBar() {
  render(<QueryClientProvider client={client}><GlobalLoadingBar /></QueryClientProvider>)
  return screen.getByRole('progressbar', { hidden: true })
}

function startQuery(key = 'new') {
  let resolve!: (value: string) => void
  const promise = new Promise<string>(done => { resolve = done })
  const fetched = client.fetchQuery({ queryKey: [key], queryFn: () => promise })
  return { resolve, fetched }
}

describe('GlobalLoadingBar', () => {
  it('is hidden when idle', () => {
    expect(renderBar()).not.toBeVisible()
  })

  it('appears after 150 ms and hides when the first load finishes', async () => {
    const pending = startQuery()
    const bar = renderBar()
    expect(bar).not.toBeVisible()
    await act(async () => { await vi.advanceTimersByTimeAsync(149) })
    expect(bar).not.toBeVisible()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(bar).toBeVisible()
    expect(bar).toHaveAttribute('aria-busy', 'true')
    await act(async () => {
      pending.resolve('loaded')
      await pending.fetched
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(bar).not.toBeVisible()
    expect(bar).toHaveAttribute('aria-busy', 'false')
  })

  it('does not flash for a response before the delay', async () => {
    const pending = startQuery()
    const bar = renderBar()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
      pending.resolve('loaded')
      await pending.fetched
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(bar).not.toBeVisible()
  })

  it('stays hidden during a refetch with cached data', async () => {
    client.setQueryData(['cached'], 'previous data')
    const pending = startQuery('cached')
    const bar = renderBar()
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    expect(client.isFetching()).toBe(1)
    expect(bar).not.toBeVisible()
    await act(async () => {
      pending.resolve('updated')
      await pending.fetched
    })
  })

  it('does not restart the delay when another first load starts', async () => {
    const first = startQuery('first')
    const bar = renderBar()
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    const second = startQuery('second')
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(bar).toBeVisible()
    await act(async () => {
      first.resolve('first')
      second.resolve('second')
      await Promise.all([first.fetched, second.fetched])
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(bar).not.toBeVisible()
  })
})
