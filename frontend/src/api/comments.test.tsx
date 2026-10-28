import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('./client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useMyComments } from './comments'
import { useAddCveComment } from './cves'

function mineCalls(): number {
  return mockGet.mock.calls.filter(([path]) => String(path).startsWith('/comments/mine')).length
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
  mockGet.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 })
  mockPost.mockResolvedValue({ id: 'new' })
})

describe('my-comments cache invalidation', () => {
  it('refetches the cached My Comments list after an own reply, despite the 30s staleTime', async () => {
    // Same defaults as main.tsx: without explicit invalidation the cached list
    // would be served for 30s after the reply.
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () => ({ list: useMyComments({ page: 1 }), add: useAddCveComment('CVE-2026-0001') }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
    expect(mineCalls()).toBe(1)

    await act(async () => {
      await result.current.add.mutateAsync({ message: 'reply' })
    })

    await waitFor(() => expect(mineCalls()).toBe(2))
  })
})
