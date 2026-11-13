import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchBlob, importExcel } from './exports'
import { isSessionExpired, resetSessionExpiredForTests, SessionExpiredError } from '../utils/sessionExpiry'

const originalFetch = globalThis.fetch

beforeEach(() => {
  resetSessionExpiredForTests()
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  resetSessionExpiredForTests()
})

describe.each([
  ['fetchBlob', () => fetchBlob('/api/exports/pdf')],
  ['importExcel', () => importExcel(new File(['data'], 'import.xlsx'), false)],
] as const)('%s', (_name, request) => {
  it('detects an HTML 403 before parsing or downloading the response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('<html>Sign in</html>', {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    }))

    await expect(request()).rejects.toThrow(SessionExpiredError)
    expect(isSessionExpired()).toBe(true)
  })

  it('preserves JSON 403 errors', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ detail: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(request()).rejects.toThrow('Permission denied')
    expect(isSessionExpired()).toBe(false)
  })
})
