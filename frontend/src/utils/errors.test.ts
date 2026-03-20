import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error')
  })

  it('extracts message from plain string', () => {
    expect(getErrorMessage('raw string')).toBe('raw string')
  })

  it('extracts detail from FastAPI error shape', () => {
    expect(getErrorMessage({ detail: 'not found' })).toBe('not found')
  })

  it('extracts messages from FastAPI validation error array', () => {
    const err = { detail: [{ msg: 'field required', loc: ['body', 'name'], type: 'missing' }] }
    expect(getErrorMessage(err)).toBe('field required')
  })

  it('joins multiple validation messages', () => {
    const err = { detail: [{ msg: 'too short' }, { msg: 'invalid format' }] }
    expect(getErrorMessage(err)).toBe('too short, invalid format')
  })

  it('falls back to default for null', () => {
    expect(getErrorMessage(null)).toBe('Unbekannter Fehler')
  })

  it('falls back to default for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Unbekannter Fehler')
  })

  it('falls back to default for empty string', () => {
    expect(getErrorMessage('')).toBe('Unbekannter Fehler')
  })

  it('uses custom fallback', () => {
    expect(getErrorMessage(null, 'custom')).toBe('custom')
  })

  it('extracts error field', () => {
    expect(getErrorMessage({ error: 'server error' })).toBe('server error')
  })

  it('handles nested message in object', () => {
    expect(getErrorMessage({ message: 'obj msg' })).toBe('obj msg')
  })

  it('handles number input', () => {
    expect(getErrorMessage(404)).toBe('404')
  })

  it('handles boolean input', () => {
    expect(getErrorMessage(false)).toBe('false')
  })
})
