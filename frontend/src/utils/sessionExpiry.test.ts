import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import {
  isSessionExpired,
  isSessionExpiredResponse,
  markSessionExpired,
  resetSessionExpiredForTests,
  SessionExpiredError,
  subscribeSessionExpired,
  throwIfSessionExpired,
} from './sessionExpiry'

beforeEach(resetSessionExpiredForTests)
afterEach(resetSessionExpiredForTests)

describe('isSessionExpiredResponse', () => {
  it.each([
    [401, 'application/json', true],
    [401, 'text/html', true],
    [403, 'text/html; charset=utf-8', true],
    [403, null, true],
    [403, 'application/json', false],
    [403, 'Application/JSON; charset=utf-8', false],
    [403, 'application/jsonp', true],
    [404, 'text/html', false],
    [500, 'text/html', false],
  ])('status %i with Content-Type %s returns %s', (status, contentType, expected) => {
    const res = new Response(null, {
      status,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
    })

    expect(isSessionExpiredResponse(res)).toBe(expected)
    expect(isSessionExpired()).toBe(false)
  })

  it('accepts response mocks without headers', () => {
    expect(isSessionExpiredResponse({ status: 403 } as Response)).toBe(true)
  })
})

describe('session expiry store', () => {
  it('notifies subscribers only once across repeated expired responses', () => {
    const listener = vi.fn()
    subscribeSessionExpired(listener)

    markSessionExpired()
    markSessionExpired()

    expect(isSessionExpired()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('stops notifying an unsubscribed listener', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSessionExpired(listener)
    unsubscribe()

    markSessionExpired()

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('throwIfSessionExpired', () => {
  it('marks the session expired and throws a dedicated error', () => {
    expect(() => throwIfSessionExpired(new Response(null, { status: 401 }))).toThrow(SessionExpiredError)
    expect(isSessionExpired()).toBe(true)
  })

  it('leaves JSON permission errors for the caller', () => {
    const res = new Response(null, { status: 403, headers: { 'Content-Type': 'application/json' } })

    expect(() => throwIfSessionExpired(res)).not.toThrow()
    expect(isSessionExpired()).toBe(false)
  })
})

describe('SessionExpiredError', () => {
  it.each([
    ['de', 'Sitzung abgelaufen'],
    ['en', 'Session expired'],
  ])('uses the current %s translation', async (language, title) => {
    await i18n.changeLanguage(language)
    expect(new SessionExpiredError()).toMatchObject({ name: 'SessionExpiredError', message: title })
  })
})
