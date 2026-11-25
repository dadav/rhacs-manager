import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { CveList } from './CveList'
import type { ImageCveDetail, ImageCveGroup } from '../types'
import { Severity } from '../types'

// Real CveList + real ImageRow; only data hooks and unrelated chrome are mocked.

const mockUseCves = vi.fn()
const mockUseCvesByImage = vi.fn()
const mockUseCveFixes = vi.fn()
const mockUseCvesForImage = vi.fn()
vi.mock('../api/cves', () => ({
  useCves: (...args: unknown[]) => mockUseCves(...args),
  useCvesByImage: (...args: unknown[]) => mockUseCvesByImage(...args),
  useCveFixes: (...args: unknown[]) => mockUseCveFixes(...args),
  useCvesForImage: (...args: unknown[]) => mockUseCvesForImage(...args),
}))

vi.mock('../api/settings', () => ({
  useThresholds: () => ({ data: undefined, isLoading: false }),
}))

vi.mock('../api/exports', () => ({
  exportPdf: vi.fn(),
  exportExcel: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'team_member', is_sec_team: false, onboarding_completed: true, namespaces: [] },
    isLoading: false,
    isSecTeam: false,
    isAuthenticated: true,
    namespaces: [],
    hasNamespaces: false,
  }),
}))

vi.mock('../hooks/useScope', () => ({
  useScope: () => ({
    cluster: undefined,
    namespace: undefined,
    ignoreThresholds: false,
    scopeParams: {},
    setScope: vi.fn(),
    setIgnoreThresholds: vi.fn(),
    scopeSearchString: '',
  }),
  useScopedLink: () => (to: string) => to,
}))

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (val: unknown) => val,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../components/ExcelImportModal', () => ({
  ExcelImportModal: () => null,
}))

vi.mock('../components/TableSkeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}))

// --- Fixtures ---

const SHARED_DIGEST = 'sha256:shared'

function makeImageGroup(overrides: Partial<ImageCveGroup>): ImageCveGroup {
  return {
    image_name: 'quay.io/app:1',
    image_id: 'sha256:1',
    total_cves: 10,
    critical_cves: 0,
    high_cves: 0,
    medium_cves: 0,
    low_cves: 0,
    max_cvss: 5.0,
    max_epss: 0.1,
    fixable_cves: 0,
    affected_deployments: 1,
    namespaces: ['payments'],
    clusters: ['cluster-a'],
    ...overrides,
  }
}

// img-a and img-c share one digest (same digest, different pull specs), img-b and img-d are unique.
// Every sort field yields a different ascending order, and no order equals the reverse of another,
// so picking the wrong comparator or direction changes the observed order.
//   name asc:        a b c d
//   total asc:       b d a c
//   critical asc:    c a b d
//   max_epss asc:    d c a b
//   fixable asc:     a c d b
//   deployments asc: d a b c
//   high asc:        a c b d   (legacy URL only)
//   max_cvss asc:    a b d c   (legacy URL only)
//   server order:    a d b c
const IMG_A = makeImageGroup({ image_name: 'img-a', image_id: SHARED_DIGEST, total_cves: 30, critical_cves: 2, max_epss: 0.3, fixable_cves: 1, affected_deployments: 2, high_cves: 1, max_cvss: 1.0 })
const IMG_B = makeImageGroup({ image_name: 'img-b', image_id: 'sha256:b', total_cves: 10, critical_cves: 3, max_epss: 0.4, fixable_cves: 4, affected_deployments: 3, high_cves: 3, max_cvss: 2.0 })
const IMG_C = makeImageGroup({ image_name: 'img-c', image_id: SHARED_DIGEST, total_cves: 40, critical_cves: 1, max_epss: 0.2, fixable_cves: 2, affected_deployments: 4, high_cves: 2, max_cvss: 4.0 })
const IMG_D = makeImageGroup({ image_name: 'img-d', image_id: 'sha256:d', total_cves: 20, critical_cves: 4, max_epss: 0.1, fixable_cves: 3, affected_deployments: 1, high_cves: 4, max_cvss: 3.0 })
const SERVER_ORDER = [IMG_A, IMG_D, IMG_B, IMG_C]

// Same field values with every digest unique: the control case.
const UNIQUE_SERVER_ORDER = SERVER_ORDER.map(g => ({ ...g, image_id: `sha256:${g.image_name}` }))

const HEADER_CASES = [
  { label: 'cves.imageGroupImage', sortBy: 'image_name', asc: ['img-a', 'img-b', 'img-c', 'img-d'] },
  { label: 'cves.imageGroupTotalCves', sortBy: 'total_cves', asc: ['img-b', 'img-d', 'img-a', 'img-c'] },
  { label: 'cves.imageGroupSeverityCounts', sortBy: 'critical_cves', asc: ['img-c', 'img-a', 'img-b', 'img-d'] },
  { label: 'cves.imageGroupMaxEpss', sortBy: 'max_epss', asc: ['img-d', 'img-c', 'img-a', 'img-b'] },
  { label: 'cves.imageGroupFixable', sortBy: 'fixable_cves', asc: ['img-a', 'img-c', 'img-d', 'img-b'] },
  { label: 'cves.imageGroupDeployments', sortBy: 'affected_deployments', asc: ['img-d', 'img-a', 'img-b', 'img-c'] },
] as const

function cveFor(imageId: string): ImageCveDetail {
  return {
    cve_id: `CVE-FOR-${imageId}`,
    severity: Severity.CRITICAL,
    cvss: 9.8,
    epss_probability: 0.9,
    impact_score: 5.9,
    fixable: true,
    fixed_by: '1.2.3',
    affected_deployments: 2,
    first_seen: '2024-01-01T00:00:00Z',
    published_on: '2024-01-01T00:00:00Z',
    fix_available_since: null,
  }
}

// --- Helpers ---

function createWrapper(initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.search}</span>
}

function renderImageView(initialEntry: string, groups: ImageCveGroup[]) {
  mockUseCvesByImage.mockReturnValue({ data: groups, isLoading: false, error: null })
  return render(<><CveList /><LocationProbe /></>, { wrapper: createWrapper(initialEntry) })
}

// Expanded rows render their own nested grid; the image table is the first in document order.
function imageTable(): HTMLElement {
  return screen.getAllByRole('grid')[0]
}

// Outer image rows are the ones carrying the expand toggle.
function outerRows(): HTMLTableRowElement[] {
  const rows = Array.from(imageTable().querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr'))
  return rows.filter(row => row.querySelector('button[aria-expanded]') !== null)
}

function imageRowOrder(): string[] {
  return outerRows().map(row => row.querySelector('a')?.textContent ?? '')
}

function outerRowFor(name: string): HTMLTableRowElement {
  const matches = outerRows().filter(row => row.querySelector('a')?.textContent === name)
  expect(matches).toHaveLength(1)
  return matches[0]
}

function toggleFor(name: string): HTMLElement {
  return outerRowFor(name).querySelector('button[aria-expanded]') as HTMLElement
}

function expandedNames(): string[] {
  return outerRows()
    .filter(row => row.querySelector('button[aria-expanded="true"]') !== null)
    .map(row => row.querySelector('a')?.textContent ?? '')
}

function currentSearch(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('location').textContent ?? '')
}

function headerCell(label: string): HTMLElement {
  return screen.getByRole('button', { name: label }).closest('th') as HTMLElement
}

function activeSortHeaders(): Array<{ text: string; sort: string }> {
  return Array.from(imageTable().querySelectorAll('thead th[aria-sort]')).map(th => ({
    text: th.textContent ?? '',
    sort: th.getAttribute('aria-sort') ?? '',
  }))
}

function duplicateKeyWarnings(spy: ReturnType<typeof vi.spyOn>): unknown[][] {
  return spy.mock.calls.filter(call => call.some(arg => typeof arg === 'string' && arg.includes('same key')))
}

function expectRowsExactly(expected: readonly string[]) {
  expect(imageRowOrder()).toEqual([...expected])
  // Multiplicity: no rendered row may be duplicated or dropped, and nothing but outer rows exists while collapsed.
  expect(imageTable().querySelectorAll(':scope > tbody > tr')).toHaveLength(expected.length)
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })
  mockUseCveFixes.mockReturnValue({ data: undefined, isLoading: false, error: null })
  mockUseCvesForImage.mockImplementation((imageId: string) => (
    imageId ? { data: [cveFor(imageId)], isLoading: false } : { data: undefined, isLoading: false }
  ))
  consoleErrorSpy = vi.spyOn(console, 'error')
})

afterEach(() => {
  // Unmount before asserting so a failed assertion never leaks DOM into the next test.
  cleanup()
  const warnings = duplicateKeyWarnings(consoleErrorSpy)
  consoleErrorSpy.mockRestore()
  expect(warnings).toEqual([])
})

// --- Tests ---

describe('CveList image view sorting', () => {
  it('keeps the server order when the URL carries a sort key outside the image view', () => {
    renderImageView('/vulnerabilities?view=image', SERVER_ORDER)
    expectRowsExactly(['img-a', 'img-d', 'img-b', 'img-c'])
    expect(activeSortHeaders()).toEqual([])
  })

  for (const fixture of [
    { title: 'shared-digest fixture', groups: SERVER_ORDER },
    { title: 'unique-digest control', groups: UNIQUE_SERVER_ORDER },
  ]) {
    describe(fixture.title, () => {
      for (const header of HEADER_CASES) {
        it(`sorts by ${header.sortBy} descending first, then ascending, then descending again`, () => {
          renderImageView('/vulnerabilities?view=image', fixture.groups)
          const desc = [...header.asc].reverse()

          fireEvent.click(screen.getByRole('button', { name: header.label }))
          expectRowsExactly(desc)
          expect(currentSearch().get('sort_by')).toBe(header.sortBy)
          expect(currentSearch().get('sort_desc')).toBe('1')
          expect(headerCell(header.label)).toHaveAttribute('aria-sort', 'descending')
          expect(activeSortHeaders()).toHaveLength(1)

          fireEvent.click(screen.getByRole('button', { name: header.label }))
          expectRowsExactly(header.asc)
          expect(currentSearch().get('sort_by')).toBe(header.sortBy)
          expect(currentSearch().get('sort_desc')).toBe('0')
          expect(headerCell(header.label)).toHaveAttribute('aria-sort', 'ascending')
          expect(activeSortHeaders()).toHaveLength(1)

          fireEvent.click(screen.getByRole('button', { name: header.label }))
          expectRowsExactly(desc)
          expect(currentSearch().get('sort_desc')).toBe('1')
          expect(headerCell(header.label)).toHaveAttribute('aria-sort', 'descending')
        })

        it(`renders ${header.sortBy} from the URL in both directions`, () => {
          const { unmount } = renderImageView(`/vulnerabilities?view=image&sort_by=${header.sortBy}&sort_desc=0`, fixture.groups)
          expectRowsExactly(header.asc)
          expect(headerCell(header.label)).toHaveAttribute('aria-sort', 'ascending')
          unmount()

          renderImageView(`/vulnerabilities?view=image&sort_by=${header.sortBy}`, fixture.groups)
          expectRowsExactly([...header.asc].reverse())
          expect(headerCell(header.label)).toHaveAttribute('aria-sort', 'descending')
        })
      }

      it('switches between headers without duplicating or dropping rows', () => {
        renderImageView('/vulnerabilities?view=image', fixture.groups)
        for (const header of HEADER_CASES) {
          fireEvent.click(screen.getByRole('button', { name: header.label }))
          expectRowsExactly([...header.asc].reverse())
        }
        // The last header is still active (descending), so one click flips it to ascending.
        const lastHeader = HEADER_CASES[HEADER_CASES.length - 1]
        fireEvent.click(screen.getByRole('button', { name: lastHeader.label }))
        expectRowsExactly(lastHeader.asc)
        for (const header of HEADER_CASES.slice(0, -1).reverse()) {
          fireEvent.click(screen.getByRole('button', { name: header.label }))
          fireEvent.click(screen.getByRole('button', { name: header.label }))
          expectRowsExactly(header.asc)
        }
      })
    })
  }

  it('honors legacy sort_by=high_cves and sort_by=max_cvss URLs without marking a header active', () => {
    const { unmount } = renderImageView('/vulnerabilities?view=image&sort_by=high_cves', SERVER_ORDER)
    expectRowsExactly(['img-d', 'img-b', 'img-c', 'img-a'])
    expect(activeSortHeaders()).toEqual([])
    unmount()

    const second = renderImageView('/vulnerabilities?view=image&sort_by=high_cves&sort_desc=0', SERVER_ORDER)
    expectRowsExactly(['img-a', 'img-c', 'img-b', 'img-d'])
    second.unmount()

    const third = renderImageView('/vulnerabilities?view=image&sort_by=max_cvss', SERVER_ORDER)
    expectRowsExactly(['img-c', 'img-d', 'img-b', 'img-a'])
    expect(activeSortHeaders()).toEqual([])
    third.unmount()

    renderImageView('/vulnerabilities?view=image&sort_by=max_cvss&sort_desc=0', SERVER_ORDER)
    expectRowsExactly(['img-a', 'img-b', 'img-d', 'img-c'])
  })

  it('starts a new column descending when coming from a legacy sort key', () => {
    renderImageView('/vulnerabilities?view=image&sort_by=high_cves&sort_desc=0', SERVER_ORDER)
    fireEvent.click(screen.getByRole('button', { name: 'cves.imageGroupTotalCves' }))
    expect(currentSearch().get('sort_by')).toBe('total_cves')
    expect(currentSearch().get('sort_desc')).toBe('1')
    expectRowsExactly(['img-c', 'img-a', 'img-d', 'img-b'])
  })

  it('keeps the existing stable order for ties in both directions', () => {
    const tied = [
      makeImageGroup({ image_name: 'tie-p', image_id: SHARED_DIGEST, total_cves: 5 }),
      makeImageGroup({ image_name: 'tie-q', image_id: 'sha256:q', total_cves: 9 }),
      makeImageGroup({ image_name: 'tie-r', image_id: SHARED_DIGEST, total_cves: 5 }),
      makeImageGroup({ image_name: 'tie-s', image_id: 'sha256:s', total_cves: 9 }),
    ]
    renderImageView('/vulnerabilities?view=image', tied)

    fireEvent.click(screen.getByRole('button', { name: 'cves.imageGroupTotalCves' }))
    expectRowsExactly(['tie-q', 'tie-s', 'tie-p', 'tie-r'])

    fireEvent.click(screen.getByRole('button', { name: 'cves.imageGroupTotalCves' }))
    expectRowsExactly(['tie-p', 'tie-r', 'tie-q', 'tie-s'])
  })

  it('links every row to image details by digest', () => {
    renderImageView('/vulnerabilities?view=image', SERVER_ORDER)
    const hrefs = Object.fromEntries(outerRows().map(row => {
      const link = row.querySelector('a') as HTMLAnchorElement
      return [link.textContent, link.getAttribute('href')]
    }))
    expect(hrefs).toEqual({
      'img-a': '/images/sha256%3Ashared',
      'img-b': '/images/sha256%3Ab',
      'img-c': '/images/sha256%3Ashared',
      'img-d': '/images/sha256%3Ad',
    })
  })
})

describe('CveList image view expansion', () => {
  it('renders a unique, resolvable expansion control id per row', () => {
    renderImageView('/vulnerabilities?view=image', SERVER_ORDER)
    const toggles = outerRows().map(row => row.querySelector('button[aria-expanded]') as HTMLElement)
    expect(toggles).toHaveLength(4)

    const ids = toggles.map(toggle => toggle.id)
    for (const id of ids) expect(id).not.toBe('')
    expect(new Set(ids).size).toBe(ids.length)
    toggles.forEach((toggle, i) => expect(document.getElementById(ids[i])).toBe(toggle))
  })

  it('keeps expansion on the same digest/name pair through sorting', () => {
    renderImageView('/vulnerabilities?view=image', SERVER_ORDER)
    fireEvent.click(toggleFor('img-c'))
    expect(expandedNames()).toEqual(['img-c'])
    expect(mockUseCvesForImage).toHaveBeenCalledWith(SHARED_DIGEST, expect.anything(), expect.anything())

    for (const header of HEADER_CASES) {
      fireEvent.click(screen.getByRole('button', { name: header.label }))
      expect(imageRowOrder()).toEqual([...header.asc].reverse())
      expect(expandedNames()).toEqual(['img-c'])
      // The detail row follows its own outer row; shared digests intentionally show per-digest data.
      const detail = outerRowFor('img-c').nextElementSibling as HTMLElement
      expect(within(detail).getByText(`CVE-FOR-${SHARED_DIGEST}`)).toBeInTheDocument()
      expect(screen.getAllByText(`CVE-FOR-${SHARED_DIGEST}`)).toHaveLength(1)
      expect(imageTable().querySelectorAll(':scope > tbody > tr')).toHaveLength(5)
    }
  })

  it('keeps expansion on the same pair when a refetch returns new objects in a new order', () => {
    const { rerender } = renderImageView('/vulnerabilities?view=image', SERVER_ORDER)
    fireEvent.click(toggleFor('img-a'))
    expect(expandedNames()).toEqual(['img-a'])

    const refetched = [IMG_C, IMG_B, IMG_A, IMG_D].map(g => ({ ...g, namespaces: [...g.namespaces] }))
    mockUseCvesByImage.mockReturnValue({ data: refetched, isLoading: false, error: null })
    rerender(<><CveList /><LocationProbe /></>)

    expect(imageRowOrder()).toEqual(['img-c', 'img-b', 'img-a', 'img-d'])
    expect(expandedNames()).toEqual(['img-a'])
    const detail = outerRowFor('img-a').nextElementSibling as HTMLElement
    expect(within(detail).getByText(`CVE-FOR-${SHARED_DIGEST}`)).toBeInTheDocument()
  })

  it('keeps expansion on the same pair when filtering removes other rows, including a same-digest sibling', () => {
    const { rerender } = renderImageView('/vulnerabilities?view=image&sort_by=image_name&sort_desc=0', SERVER_ORDER)
    fireEvent.click(toggleFor('img-c'))
    fireEvent.click(toggleFor('img-b'))
    expect(expandedNames()).toEqual(['img-b', 'img-c'])

    mockUseCvesByImage.mockReturnValue({ data: [{ ...IMG_C }, { ...IMG_B }], isLoading: false, error: null })
    rerender(<><CveList /><LocationProbe /></>)
    expect(imageRowOrder()).toEqual(['img-b', 'img-c'])
    expect(expandedNames()).toEqual(['img-b', 'img-c'])

    mockUseCvesByImage.mockReturnValue({ data: [{ ...IMG_C }], isLoading: false, error: null })
    rerender(<><CveList /><LocationProbe /></>)
    expect(imageRowOrder()).toEqual(['img-c'])
    expect(expandedNames()).toEqual(['img-c'])

    mockUseCvesByImage.mockReturnValue({ data: SERVER_ORDER, isLoading: false, error: null })
    rerender(<><CveList /><LocationProbe /></>)
    expect(imageRowOrder()).toEqual(['img-a', 'img-b', 'img-c', 'img-d'])
    expect(expandedNames()).toEqual(['img-c'])
  })
})
