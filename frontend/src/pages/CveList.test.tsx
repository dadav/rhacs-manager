import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CveList } from './CveList'
import type { Paginated, CveListItem, FixRollupItem, FixRollupResponse, ImageCveGroup } from '../types'
import { Severity } from '../types'

// --- Mocks ---

const mockUseCves = vi.fn()
const mockUseCvesByImage = vi.fn()
const mockUseCveFixes = vi.fn()
vi.mock('../api/cves', () => ({
  useCves: (...args: unknown[]) => mockUseCves(...args),
  useCvesByImage: (...args: unknown[]) => mockUseCvesByImage(...args),
  useCveFixes: (...args: unknown[]) => mockUseCveFixes(...args),
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

let mockScopeParams: { cluster?: string; namespace?: string; ignoreThresholds?: boolean } = {}
vi.mock('../hooks/useScope', () => ({
  useScope: () => ({
    cluster: undefined,
    namespace: undefined,
    ignoreThresholds: mockScopeParams.ignoreThresholds ?? false,
    scopeParams: mockScopeParams,
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

// Renders only the image name so tests can observe row order in the image view.
vi.mock('../components/ImageRow', () => ({
  ImageRow: ({ group }: { group: ImageCveGroup }) => (
    <tr data-testid="image-row"><td>{group.image_name}</td></tr>
  ),
}))

vi.mock('../components/common/EpssBadge', () => ({
  EpssBadge: ({ value }: { value: number }) => <span>{value}</span>,
}))

vi.mock('../components/common/SeverityBadge', () => ({
  SeverityBadge: ({ severity }: { severity: number }) => <span>sev-{severity}</span>,
}))

vi.mock('../components/TableSkeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}))

// --- Helpers ---

function makeCve(overrides: Partial<CveListItem> = {}): CveListItem {
  return {
    cve_id: 'CVE-2024-0001',
    severity: Severity.CRITICAL,
    cvss: 9.8,
    epss_probability: 0.95,
    impact_score: 5.9,
    fixable: true,
    fixed_by: '1.2.3',
    affected_images: 3,
    affected_deployments: 5,
    first_seen: '2024-01-01T00:00:00Z',
    published_on: '2024-01-01T00:00:00Z',
    has_priority: false,
    priority_level: null,
    priority_deadline: null,
    component_names: ['openssl'],
    has_risk_acceptance: false,
    risk_acceptance_status: null,
    risk_acceptance_id: null,
    is_suppressed: false,
    suppression_requested: false,
    ...overrides,
  }
}

function makeImageGroup(overrides: Partial<ImageCveGroup> = {}): ImageCveGroup {
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

// Critical, high, and total orderings deliberately disagree so each sort key is distinguishable.
const IMAGE_GROUPS: ImageCveGroup[] = [
  makeImageGroup({ image_name: 'img-most-total', image_id: 'a', total_cves: 90, critical_cves: 1, high_cves: 2 }),
  makeImageGroup({ image_name: 'img-most-critical', image_id: 'b', total_cves: 20, critical_cves: 9, high_cves: 1 }),
  makeImageGroup({ image_name: 'img-most-high', image_id: 'c', total_cves: 30, critical_cves: 0, high_cves: 8 }),
]

function imageRowOrder(): string[] {
  return screen.getAllByTestId('image-row').map(row => row.textContent ?? '')
}

function createWrapper(initialEntry = '/vulnerabilities') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockScopeParams = {}
  // Default: image view returns empty to avoid errors
  mockUseCvesByImage.mockReturnValue({ data: [], isLoading: false, error: null })
  mockUseCveFixes.mockReturnValue({ data: undefined, isLoading: false, error: null })
})

// --- Tests ---

describe('CveList', () => {
  it('renders loading state', () => {
    mockUseCves.mockReturnValue({ data: undefined, isLoading: true, error: null })
    render(<CveList />, { wrapper: createWrapper() })
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('renders CVE table rows when data loads', () => {
    const items: CveListItem[] = [
      makeCve({ cve_id: 'CVE-2024-0001' }),
      makeCve({ cve_id: 'CVE-2024-0002', severity: Severity.LOW, cvss: 3.1 }),
    ]
    const paginated: Paginated<CveListItem> = { items, total: 2, page: 1, page_size: 50 }
    mockUseCves.mockReturnValue({ data: paginated, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper() })
    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
    expect(screen.getByText('CVE-2024-0002')).toBeInTheDocument()
  })

  it('renders only the key triage columns in the CVE view', () => {
    const paginated: Paginated<CveListItem> = { items: [makeCve()], total: 1, page: 1, page_size: 50 }
    mockUseCves.mockReturnValue({ data: paginated, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper() })

    const headers = screen.getAllByRole('columnheader').map(th => th.textContent)
    expect(headers).toEqual([
      'cves.cveId',
      'cves.severity',
      expect.stringContaining('cves.cvss'),
      'cves.epss',
      'cves.affectedDeployments',
      'cves.fixable',
      'cves.firstSeen',
    ])
    const table = screen.getByRole('grid')
    expect(within(table).queryByText('cves.affectedImages')).toBeNull()
    expect(within(table).queryByText('cves.publishedOn')).toBeNull()
    expect(within(table).queryByText('cves.fixAvailableSince')).toBeNull()
  })

  it('sorts the image view by critical count when the combined severity header is clicked', () => {
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })
    mockUseCvesByImage.mockReturnValue({ data: IMAGE_GROUPS, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper('/vulnerabilities?view=image&sort_by=total_cves') })
    expect(imageRowOrder()).toEqual(['img-most-total', 'img-most-high', 'img-most-critical'])

    fireEvent.click(screen.getByRole('button', { name: 'cves.imageGroupSeverityCounts' }))

    expect(imageRowOrder()).toEqual(['img-most-critical', 'img-most-total', 'img-most-high'])
  })

  it('still honors a sort_by=high_cves URL in the image view', () => {
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })
    mockUseCvesByImage.mockReturnValue({ data: IMAGE_GROUPS, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper('/vulnerabilities?view=image&sort_by=high_cves') })

    expect(imageRowOrder()).toEqual(['img-most-high', 'img-most-total', 'img-most-critical'])
  })

  it('shows empty state when no CVEs', () => {
    const paginated: Paginated<CveListItem> = { items: [], total: 0, page: 1, page_size: 50 }
    mockUseCves.mockReturnValue({ data: paginated, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper() })
    // The empty state renders the translation key "cves.noResults"
    expect(screen.getByText('cves.noResults')).toBeInTheDocument()
  })

  it('shows error state on API failure', () => {
    mockUseCves.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Network error') })

    render(<CveList />, { wrapper: createWrapper() })
    expect(screen.getByText(/Network error/)).toBeInTheDocument()
  })

  it('does not request the component roll-up outside the component view', () => {
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })
    render(<CveList />, { wrapper: createWrapper() })
    expect(mockUseCveFixes).toHaveBeenCalled()
    expect(mockUseCveFixes.mock.calls.every(call => call[2] === false)).toBe(true)
  })

  it('renders component rows with the upgrade target in the component view', () => {
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })
    const item: FixRollupItem = {
      component_name: 'openssl',
      component_version: '3.0.7',
      operating_system: 'rhel:9',
      target_version: '3.0.10',
      fix_versions: ['3.0.10', '3.0.9'],
      target_uncertain: false,
      total_cves: 3,
      fixable_cves: 2,
      prioritized_cves: 0,
      critical_cves: 1,
      max_severity: Severity.CRITICAL,
      max_cvss: 9.8,
      max_epss: 0.5,
      affected_images: 2,
      affected_deployments: 4,
      namespaces: ['cluster-a/payments'],
      images: [],
      cves: [],
    }
    const response: FixRollupResponse = { items: [item], total: 1, page: 1, page_size: 50, visible_cves: 4, unmapped_cves: 1 }
    mockUseCveFixes.mockReturnValue({ data: response, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper('/vulnerabilities?view=component') })

    expect(mockUseCveFixes.mock.calls.at(-1)?.[2]).toBe(true)
    expect(screen.getByText('openssl')).toBeInTheDocument()
    expect(screen.getByText(/3\.0\.10/)).toBeInTheDocument()
    expect(screen.getByText(/cves.componentUnmapped/)).toBeInTheDocument()
  })

  it('applies a deployment_id link filter to every view and shows its label', () => {
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })

    render(<CveList />, {
      wrapper: createWrapper('/vulnerabilities?view=component&deployment_id=dep-1&deployment_label=cluster-a%2Fpayments%2Fapi'),
    })

    expect(mockUseCves.mock.calls.at(-1)?.[0]).toMatchObject({ deployment_id: 'dep-1' })
    expect(mockUseCveFixes.mock.calls.at(-1)?.[0]).toMatchObject({ deployment_id: 'dep-1' })
    expect(screen.getByText('cluster-a/payments/api')).toBeInTheDocument()
  })

  it('forwards the threshold opt-out to every view', () => {
    mockScopeParams = { ignoreThresholds: true }
    mockUseCves.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false, error: null })

    render(<CveList />, { wrapper: createWrapper('/vulnerabilities?ignore_thresholds=1') })

    expect(mockUseCves.mock.calls.at(-1)?.[1]).toMatchObject({ ignoreThresholds: true })
    expect(mockUseCvesByImage.mock.calls.at(-1)?.[0]).toMatchObject({ ignoreThresholds: true })
    expect(mockUseCveFixes.mock.calls.at(-1)?.[1]).toMatchObject({ ignoreThresholds: true })
  })
})
