import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { CveList } from './CveList'
import type { Paginated, CveListItem } from '../types'
import { Severity } from '../types'

// --- Mocks ---

const mockUseCves = vi.fn()
const mockUseCvesByImage = vi.fn()
vi.mock('../api/cves', () => ({
  useCves: (...args: unknown[]) => mockUseCves(...args),
  useCvesByImage: (...args: unknown[]) => mockUseCvesByImage(...args),
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
    scopeParams: {},
    setScope: vi.fn(),
    scopeSearchString: '',
  }),
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

vi.mock('../components/ImageRow', () => ({
  ImageRow: () => null,
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

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: image view returns empty to avoid errors
  mockUseCvesByImage.mockReturnValue({ data: [], isLoading: false, error: null })
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
})
