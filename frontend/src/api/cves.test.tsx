import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockGet = vi.fn()
vi.mock('./client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { cveKeys, useCveDeployments, useCveDetail } from './cves'

function wrapperFor(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mockGet.mockReset()
  mockGet.mockResolvedValue({})
})

describe('CVE detail scope', () => {
  it('sends the sidebar scope with the detail request', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(
      () => useCveDetail('CVE-2024-1234', { cluster: 'cluster-a', namespace: 'payments', ignoreThresholds: true }),
      { wrapper: wrapperFor(qc) },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGet).toHaveBeenCalledWith('/cves/CVE-2024-1234?cluster=cluster-a&namespace=payments')
  })

  it('sends no query string without a scope', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCveDetail('CVE-2024-1234'), { wrapper: wrapperFor(qc) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGet).toHaveBeenCalledWith('/cves/CVE-2024-1234')
  })

  it('scopes the deployments request', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCveDeployments('CVE-2024-1234', { namespace: 'payments' }), {
      wrapper: wrapperFor(qc),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGet).toHaveBeenCalledWith('/cves/CVE-2024-1234/deployments?namespace=payments')
  })

  it('caches each scope separately while the id prefix still matches all of them', () => {
    const scoped = cveKeys.detail('CVE-2024-1234', { namespace: 'payments' })
    const unscoped = cveKeys.detail('CVE-2024-1234')
    expect(scoped).not.toEqual(unscoped)
    expect(scoped.slice(0, 3)).toEqual(['cves', 'detail', 'CVE-2024-1234'])
    expect(unscoped.slice(0, 3)).toEqual(['cves', 'detail', 'CVE-2024-1234'])
  })
})
