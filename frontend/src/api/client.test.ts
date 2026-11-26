import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, ApiRequestError } from './client'
import { isSessionExpired, resetSessionExpiredForTests, SessionExpiredError } from '../utils/sessionExpiry'

describe('api client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetSessionExpiredForTests()
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    resetSessionExpiredForTests()
  })

  it('GET sends correct request', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    const result = await api.get('/test')
    expect(result).toEqual({ data: 'test' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object))
    expect(new Headers(vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers).get('Content-Type')).toBe('application/json')
  })

  it('POST sends JSON body', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ id: '1' }) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await api.post('/items', { name: 'test' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    }))
  })

  it('handles 204 No Content', async () => {
    const mockResponse = { ok: true, status: 204 }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    const result = await api.delete('/items/1')
    expect(result).toBeUndefined()
  })

  it('throws on HTTP error with detail', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await expect(api.get('/missing')).rejects.toThrow('Not found')
  })

  it('throws with HTTP status when JSON parse fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('invalid json')),
    }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await expect(api.get('/broken')).rejects.toThrow('HTTP 500')
  })

  it('marks an HTML 403 as session expired', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('<html>Sign in</html>', {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    }))

    await expect(api.get('/auth/me')).rejects.toThrow(SessionExpiredError)
    expect(isSessionExpired()).toBe(true)
  })

  it('preserves JSON 403 permission errors without expiring the session', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ detail: 'Security team only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(api.get('/settings')).rejects.toThrow('Security team only')
    expect(isSessionExpired()).toBe(false)
  })

  it('PATCH sends correct method', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await api.patch('/items/1', { name: 'updated' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
      method: 'PATCH',
    }))
  })

  it('PUT sends correct method', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await api.put('/items/1', { name: 'replaced' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
      method: 'PUT',
    }))
  })
  it('GET passes an AbortSignal through and keeps the default headers', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)
    const controller = new AbortController()

    await api.get('/activity', { signal: controller.signal })
    const init = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit
    expect(init.signal).toBe(controller.signal)
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(new Headers(init.headers).get('Accept-Language')).toBeTruthy()
  })

  it('merges custom headers with the defaults instead of replacing them', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    await api.get('/x', { headers: { 'X-Extra': '1' } })
    await api.get('/y', { headers: new Headers({ 'X-Other': '2' }) })
    const first = vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit
    const second = vi.mocked(globalThis.fetch).mock.calls[1][1] as RequestInit
    expect(new Headers(first.headers).get('Content-Type')).toBe('application/json')
    expect(new Headers(first.headers).get('X-Extra')).toBe('1')
    expect(new Headers(second.headers).get('Content-Type')).toBe('application/json')
    expect(new Headers(second.headers).get('X-Other')).toBe('2')
  })

  it('rejects an aborted GET without marking the session expired', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const controller = new AbortController()
    const pending = api.get('/activity', { signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toThrow('Aborted')
    expect(isSessionExpired()).toBe(false)
  })

  it.each(([
    { 'content-type': 'text/plain', 'ACCEPT-LANGUAGE': 'en' },
    [['content-type', 'text/plain'], ['Accept-Language', 'en']],
    new Headers({ 'Content-Type': 'text/plain', 'Accept-Language': 'en' }),
  ] satisfies HeadersInit[]).map(headers => ({ headers })))('overrides default headers regardless of casing or representation: %j', async ({ headers }) => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response('{}'))

    await api.get('/activity', { headers })

    const sent = new Headers(vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers)
    expect(sent.get('content-type')).toBe('text/plain')
    expect(sent.get('accept-language')).toBe('en')
  })

  it('exposes the HTTP status on API errors', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(new Response(JSON.stringify({ detail: 'Bad cursor' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))

    const error = await api.get('/activity').catch(e => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(400)
    expect(error.message).toBe('Bad cursor')
  })
})
