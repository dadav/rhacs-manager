import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { CveDetail } from './CveDetail'
import type { CveDetail as CveDetailType } from '../types'
import { Severity } from '../types'

// --- Mocks ---

const mockUseCveDetail = vi.fn()
const mockUseCveComments = vi.fn()
const mockUseAddCveComment = vi.fn()
const mockUseEditCveComment = vi.fn()
const mockUseDeleteCveComment = vi.fn()
vi.mock('../api/cves', () => ({
  useCveDetail: (...args: unknown[]) => mockUseCveDetail(...args),
  useCveComments: (...args: unknown[]) => mockUseCveComments(...args),
  useAddCveComment: (...args: unknown[]) => mockUseAddCveComment(...args),
  useEditCveComment: (...args: unknown[]) => mockUseEditCveComment(...args),
  useDeleteCveComment: (...args: unknown[]) => mockUseDeleteCveComment(...args),
}))

vi.mock('../api/suppressionRules', () => ({
  useCreateSuppressionRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../api/remediations', () => ({
  useRemediationsByCve: () => ({ data: [], isLoading: false }),
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${key} (${opts.count})`
      return key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../components/CveWorkflowStepper', () => ({
  CveWorkflowStepper: () => <div data-testid="workflow-stepper" />,
}))

vi.mock('../components/CveLifecycleTimeline', () => ({
  CveLifecycleTimeline: () => <div data-testid="lifecycle-timeline" />,
}))

vi.mock('../components/CveRemediation', () => ({
  CveRemediationSection: () => <div data-testid="remediation-section" />,
}))

vi.mock('../components/common/EpssBadge', () => ({
  EpssBadge: ({ value }: { value: number }) => <span>{value}</span>,
}))

vi.mock('../components/common/SeverityBadge', () => ({
  SeverityBadge: ({ severity }: { severity: number }) => <span>sev-{severity}</span>,
}))

// --- Helpers ---

function makeCveDetail(overrides: Partial<CveDetailType> = {}): CveDetailType {
  return {
    cve_id: 'CVE-2024-1234',
    severity: Severity.CRITICAL,
    cvss: 9.8,
    epss_probability: 0.92,
    impact_score: 5.9,
    fixable: true,
    fixed_by: '2.0.0',
    affected_images: 2,
    affected_deployments: 4,
    first_seen: '2024-01-15T00:00:00Z',
    published_on: '2024-01-10T00:00:00Z',
    has_priority: false,
    priority_level: null,
    priority_deadline: null,
    component_names: ['openssl'],
    has_risk_acceptance: false,
    risk_acceptance_status: null,
    risk_acceptance_id: null,
    is_suppressed: false,
    suppression_requested: false,
    affected_deployments_list: [
      { deployment_id: 'd1', deployment_name: 'api-server', namespace: 'prod', cluster_name: 'cluster-a', image_name: 'registry/api:v1', first_seen: '2025-01-15T10:00:00Z' },
    ],
    components: [
      { component_name: 'openssl', component_version: '1.1.1', fixable: true, fixed_by: '2.0.0' },
    ],
    contact_emails: ['sec@example.com'],
    cvss_metric_urls: [],
    priority_reason: null,
    priority_set_by_name: null,
    priority_created_at: null,
    risk_acceptance_requested_at: null,
    risk_acceptance_reviewed_at: null,
    escalation_level1_at: null,
    escalation_level2_at: null,
    escalation_level3_at: null,
    escalation_level1_expected: null,
    escalation_level2_expected: null,
    escalation_level3_expected: null,
    ...overrides,
  }
}

function createWrapper(cveId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/vulnerabilities/${cveId}`]}>
          <Routes>
            <Route path="/vulnerabilities/:cveId" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCveComments.mockReturnValue({ data: [], isLoading: false })
  mockUseAddCveComment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseEditCveComment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCveComment.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

// --- Tests ---

describe('CveDetail', () => {
  it('renders loading state', () => {
    mockUseCveDetail.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { container } = render(<CveDetail />, { wrapper: createWrapper('CVE-2024-1234') })
    // Loading state renders Skeleton components
    const skeletons = container.querySelectorAll('.pf-v6-c-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders CVE detail fields', () => {
    const cve = makeCveDetail()
    mockUseCveDetail.mockReturnValue({ data: cve, isLoading: false, error: null })

    render(<CveDetail />, { wrapper: createWrapper('CVE-2024-1234') })

    // CVE ID is displayed (appears in breadcrumb and title)
    expect(screen.getAllByText('CVE-2024-1234').length).toBeGreaterThanOrEqual(1)
    // CVSS value is shown
    expect(screen.getByText('9.8')).toBeInTheDocument()
    // Component name is rendered
    expect(screen.getByText('openssl')).toBeInTheDocument()
    // Contact email
    expect(screen.getByText('sec@example.com')).toBeInTheDocument()
    // Deployment name
    expect(screen.getByText('api-server')).toBeInTheDocument()
  })

  it('shows error state when CVE not found', () => {
    mockUseCveDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Not found') })

    render(<CveDetail />, { wrapper: createWrapper('CVE-9999-0000') })
    expect(screen.getByText(/Not found/)).toBeInTheDocument()
  })

  it('renders nothing when data is undefined and no error', () => {
    mockUseCveDetail.mockReturnValue({ data: undefined, isLoading: false, error: null })

    const { container } = render(<CveDetail />, { wrapper: createWrapper('CVE-2024-1234') })
    // Component returns null when !isLoading && !error && !cve
    expect(container.innerHTML).toBe('')
  })
})
