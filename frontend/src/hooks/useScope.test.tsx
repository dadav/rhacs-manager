import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { buildScopedTo, scopeApiParams, useScope, useScopedLink } from './useScope'

function wrapperFor(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  }
}

describe('useScope threshold opt-out', () => {
  it('is off by default and absent from scopeParams and links', () => {
    const { result } = renderHook(() => useScope(), { wrapper: wrapperFor('/cves?cluster=c1&ns=payments') })

    expect(result.current.ignoreThresholds).toBe(false)
    expect(result.current.scopeParams.ignoreThresholds).toBeUndefined()
    expect(result.current.scopeSearchString).toBe('cluster=c1&ns=payments')
  })

  it('reads ignore_thresholds=1 from the URL and keeps it in scoped links', () => {
    const { result } = renderHook(() => useScope(), { wrapper: wrapperFor('/cves?ns=payments&ignore_thresholds=1') })

    expect(result.current.ignoreThresholds).toBe(true)
    expect(result.current.scopeParams).toMatchObject({ namespace: 'payments', ignoreThresholds: true })
    expect(result.current.scopeSearchString).toBe('ns=payments&ignore_thresholds=1')
  })

  it('toggles the URL param and resets the page', () => {
    const { result } = renderHook(() => useScope(), { wrapper: wrapperFor('/cves?page=3') })

    act(() => result.current.setIgnoreThresholds(true))
    expect(result.current.ignoreThresholds).toBe(true)

    act(() => result.current.setIgnoreThresholds(false))
    expect(result.current.ignoreThresholds).toBe(false)
    expect(result.current.scopeSearchString).toBe('')
  })
})

describe('scopeApiParams', () => {
  it('maps the opt-out to the backend query param only when on', () => {
    expect(scopeApiParams({ cluster: 'c1', namespace: 'ns1' })).toEqual({
      cluster: 'c1',
      namespace: 'ns1',
      ignore_thresholds: undefined,
    })
    expect(scopeApiParams({ ignoreThresholds: true })).toMatchObject({ ignore_thresholds: true })
  })
})

describe('buildScopedTo', () => {
  it('returns the target unchanged without scope', () => {
    expect(buildScopedTo('/vulnerabilities?severity=4', '')).toBe('/vulnerabilities?severity=4')
  })

  it('appends scope and the opt-out to a bare path', () => {
    expect(buildScopedTo('/images/abc', 'ns=payments&ignore_thresholds=1')).toBe('/images/abc?ns=payments&ignore_thresholds=1')
  })

  it('keeps params already in the target instead of duplicating them', () => {
    expect(buildScopedTo('/vulnerabilities?cluster=c2&severity=3', 'cluster=c1&ignore_thresholds=1')).toBe(
      '/vulnerabilities?cluster=c2&severity=3&ignore_thresholds=1',
    )
  })
})

describe('useScopedLink', () => {
  it('builds links from the current URL scope', () => {
    const { result } = renderHook(() => useScopedLink(), { wrapper: wrapperFor('/cves?cluster=c1&ignore_thresholds=1&page=2') })

    expect(result.current('/vulnerabilities/CVE-1')).toBe('/vulnerabilities/CVE-1?cluster=c1&ignore_thresholds=1')
  })
})
