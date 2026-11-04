import de from './releases.de.json'
import en from './releases.en.json'

export const RELEASE_KINDS = ['feature', 'improvement', 'fix', 'security'] as const
export type ReleaseKind = (typeof RELEASE_KINDS)[number]

export interface ReleaseItem {
  id: string
  kind: ReleaseKind
  // Plain text; never HTML or markdown.
  text: string
}

export interface Release {
  // MAJOR.MINOR.PATCH without leading "v" (same format as package.json).
  version: string
  // YYYY-MM-DD
  date: string
  items: ReleaseItem[]
}

interface ReleaseDocument {
  releases: Release[]
}

// JSON imports type `kind` as string; releaseNotes.test.ts enforces valid kinds and newest-first order.
const RELEASES_BY_LANGUAGE: Record<'de' | 'en', ReleaseDocument> = {
  de: de as ReleaseDocument,
  en: en as ReleaseDocument,
}

export const LAST_SEEN_STORAGE_KEY = 'rhacs-manager.whats-new.last-seen'

export const GITHUB_RELEASES_URL = 'https://github.com/dadav/rhacs-manager/releases/tag'

/** German for any `de*` language, English otherwise (matches `fallbackLng: 'en'`). */
export function getReleases(language: string): Release[] {
  return language.startsWith('de') ? RELEASES_BY_LANGUAGE.de.releases : RELEASES_BY_LANGUAGE.en.releases
}

/** Numeric MAJOR.MINOR.PATCH comparison (the only format `just release` accepts). Negative if a < b. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < 3; index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Drops notes for versions newer than the running build. Notes are committed before
 * `just release` bumps package.json, and main builds are published too, so a build can
 * already contain notes for the next release.
 */
export function visibleReleases(releases: Release[], currentVersion: string): Release[] {
  return releases.filter((release) => compareVersions(release.version, currentVersion) <= 0)
}

export function findRelease(releases: Release[], version: string): Release | undefined {
  return releases.find((release) => release.version === version)
}

/** True only when the running version has notes and the user has not opened them yet. */
export function hasUnseenRelease(releases: Release[], currentVersion: string, lastSeen: string | null): boolean {
  return findRelease(releases, currentVersion) !== undefined && lastSeen !== currentVersion
}

// Every access sits in try/catch: the `localStorage` getter itself throws when site data is blocked.
export function readLastSeenVersion(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeLastSeenVersion(version: string): void {
  try {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, version)
  } catch {
    // Storage unavailable: the dot simply shows again on the next load.
  }
}
