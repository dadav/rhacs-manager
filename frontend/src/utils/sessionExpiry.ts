import i18n from '../i18n'

let expired = false
const listeners = new Set<() => void>()

export function isSessionExpiredResponse(res: Response): boolean {
  if (res.status === 401) return true
  if (res.status !== 403) return false

  const contentType = res.headers?.get('Content-Type')?.split(';')[0].trim().toLowerCase()
  return contentType !== 'application/json'
}

export class SessionExpiredError extends Error {
  constructor() {
    super(i18n.t('app.sessionExpired.title'))
    this.name = 'SessionExpiredError'
  }
}

export function markSessionExpired(): void {
  if (expired) return
  expired = true
  for (const listener of listeners) listener()
}

export function isSessionExpired(): boolean {
  return expired
}

export function subscribeSessionExpired(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetSessionExpiredForTests(): void {
  expired = false
  listeners.clear()
}

export function throwIfSessionExpired(res: Response): void {
  if (!isSessionExpiredResponse(res)) return
  markSessionExpired()
  throw new SessionExpiredError()
}
