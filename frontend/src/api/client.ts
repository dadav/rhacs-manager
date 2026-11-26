import i18n from '../i18n'
import { extractApiError } from '../utils/errors'
import { throwIfSessionExpired } from '../utils/sessionExpiry'

const BASE = '/api'

/** Non-2xx API response. `message` is the localized backend detail, as before. */
export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { headers, ...rest } = options ?? {}
  const mergedHeaders = new Headers({
    'Content-Type': 'application/json',
    // Tells the backend which language to localize error messages in.
    'Accept-Language': i18n.language || 'de',
  })
  // Header names are case-insensitive for every supported HeadersInit shape.
  new Headers(headers).forEach((value, name) => mergedHeaders.set(name, value))
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
  })

  throwIfSessionExpired(res)
  if (!res.ok) {
    throw new ApiRequestError(res.status, await extractApiError(res))
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export const api = {
  /** `init` is optional and passes e.g. a TanStack Query AbortSignal through to fetch. */
  get: <T>(path: string, init?: RequestInit) => apiFetch<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
