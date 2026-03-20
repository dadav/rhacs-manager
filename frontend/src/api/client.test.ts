import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from './client'

describe('api client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('GET sends correct request', async () => {
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({ data: 'test' }) }
    vi.mocked(globalThis.fetch).mockResolvedValue(mockResponse as Response)

    const result = await api.get('/test')
    expect(result).toEqual({ data: 'test' })
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }))
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
})
