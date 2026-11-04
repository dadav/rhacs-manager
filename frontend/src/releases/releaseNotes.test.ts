import { describe, it, expect, vi, beforeEach } from 'vitest'
import de from './releases.de.json'
import en from './releases.en.json'
import pkg from '../../package.json'
import { installMemoryStorage, installThrowingStorage } from '../test/memoryStorage'
import {
  LAST_SEEN_STORAGE_KEY,
  RELEASE_KINDS,
  compareVersions,
  getReleases,
  hasUnseenRelease,
  readLastSeenVersion,
  visibleReleases,
  writeLastSeenVersion,
  type Release,
} from './releaseNotes'

const SAMPLE: Release[] = [
  { version: '0.10.0', date: '2026-02-01', items: [{ id: 'a', kind: 'feature', text: 'A' }] },
  { version: '0.9.1', date: '2026-01-15', items: [{ id: 'b', kind: 'fix', text: 'B' }] },
  { version: '0.9.0', date: '2026-01-01', items: [{ id: 'c', kind: 'security', text: 'C' }] },
]

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

describe('release notes content files', () => {
  it('have identical versions, dates, item ids and kinds in de and en', () => {
    const shape = (doc: { releases: { version: string; date: string; items: { id: string; kind: string }[] }[] }) =>
      doc.releases.map((release) => ({
        version: release.version,
        date: release.date,
        items: release.items.map((item) => ({ id: item.id, kind: item.kind })),
      }))
    expect(shape(de)).toEqual(shape(en))
  })

  it.each([
    ['de', de],
    ['en', en],
  ])('%s is valid and newest first', (_lang, doc) => {
    const versions = doc.releases.map((release) => release.version)
    expect(new Set(versions).size).toBe(versions.length)
    for (let index = 1; index < versions.length; index++) {
      expect(compareVersions(versions[index - 1], versions[index])).toBeGreaterThan(0)
    }
    for (const release of doc.releases) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(isRealDate(release.date)).toBe(true)
      expect(release.items.length).toBeGreaterThan(0)
      const ids = release.items.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const item of release.items) {
        expect(item.id.trim()).not.toBe('')
        expect(RELEASE_KINDS).toContain(item.kind)
        expect(item.text.trim()).not.toBe('')
      }
    }
  })

  it('contain an entry for the package.json version', () => {
    expect(de.releases.map((release) => release.version)).toContain(pkg.version)
    expect(en.releases.map((release) => release.version)).toContain(pkg.version)
  })
})

describe('isRealDate (test helper)', () => {
  it('rejects impossible dates', () => {
    expect(isRealDate('2026-99-99')).toBe(false)
    expect(isRealDate('2026-02-30')).toBe(false)
    expect(isRealDate('2026-02-28')).toBe(true)
  })
})

describe('getReleases', () => {
  it('selects the language by prefix and falls back to English', () => {
    expect(getReleases('de')).toBe(de.releases)
    expect(getReleases('de-AT')).toBe(de.releases)
    expect(getReleases('en')).toBe(en.releases)
    expect(getReleases('fr')).toBe(en.releases)
  })
})

describe('compareVersions', () => {
  it('compares numerically, not as strings', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('0.9.9', '0.10.0')).toBeLessThan(0)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
  })
})

describe('visibleReleases', () => {
  it('drops releases newer than the running version', () => {
    expect(visibleReleases(SAMPLE, '0.9.1').map((release) => release.version)).toEqual(['0.9.1', '0.9.0'])
  })

  it('keeps everything up to a version without its own entry', () => {
    expect(visibleReleases(SAMPLE, '0.9.5').map((release) => release.version)).toEqual(['0.9.1', '0.9.0'])
  })
})

describe('hasUnseenRelease', () => {
  it('is true when the running version has notes and was not seen', () => {
    expect(hasUnseenRelease(SAMPLE, '0.9.1', null)).toBe(true)
    expect(hasUnseenRelease(SAMPLE, '0.9.1', '0.9.0')).toBe(true)
  })

  it('is false once the running version was seen', () => {
    expect(hasUnseenRelease(SAMPLE, '0.9.1', '0.9.1')).toBe(false)
  })

  it('is false when the running version has no notes', () => {
    expect(hasUnseenRelease(SAMPLE, '0.9.5', null)).toBe(false)
  })
})

describe('last seen storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = installMemoryStorage()
  })

  it('round-trips the version', () => {
    expect(readLastSeenVersion()).toBeNull()
    writeLastSeenVersion('0.9.1')
    expect(storage.getItem(LAST_SEEN_STORAGE_KEY)).toBe('0.9.1')
    expect(readLastSeenVersion()).toBe('0.9.1')
  })

  it('tolerates throwing getItem and setItem', () => {
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(readLastSeenVersion()).toBeNull()
    expect(() => writeLastSeenVersion('0.9.1')).not.toThrow()
  })

  it('tolerates a throwing localStorage getter', () => {
    installThrowingStorage()
    expect(readLastSeenVersion()).toBeNull()
    expect(() => writeLastSeenVersion('0.9.1')).not.toThrow()
  })
})
