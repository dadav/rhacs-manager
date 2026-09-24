/**
 * Navigation must keep the sidebar scope and the "Show all CVEs" opt-out
 * (ignore_thresholds=1) in the URL. Each test starts on a page with the opt-out
 * on, follows a real in-app link with the real useScope hook, and checks the
 * resulting location.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { Table, Tbody } from '@patternfly/react-table'
import type { ReactNode } from 'react'
import { ComponentFixTable } from '../components/ComponentFixTable'
import { ImageRow } from '../components/ImageRow'
import { Dashboard } from '../pages/Dashboard'
import { ImageDetail } from '../pages/ImageDetail'
import { Severity } from '../types'
import type { DashboardData, FixRollupItem, ImageCveGroup, ImageDetail as ImageDetailType } from '../types'

const mockUseImageDetail = vi.fn()
const mockUseCveFixes = vi.fn()
const mockUseDashboard = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../api/cves', () => ({
  useCvesForImage: () => ({ data: undefined, isLoading: false }),
  useCveFixes: (...args: unknown[]) => mockUseCveFixes(...args),
}))

vi.mock('../api/images', () => ({
  useImageDetail: (...args: unknown[]) => mockUseImageDetail(...args),
}))

vi.mock('../api/dashboard', () => ({
  useDashboard: (...args: unknown[]) => mockUseDashboard(...args),
}))

vi.mock('../api/settings', () => ({
  useThresholds: () => ({ data: undefined }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isSecTeam: false }),
}))

// Chart libraries do not render in jsdom; replace charts with buttons that fire
// the same drilldown callbacks the real charts do.
vi.mock('../components/charts/SeverityDonut', () => ({
  SeverityDonut: ({ onSegmentClick }: { onSegmentClick: (severity: number) => void }) => (
    <button onClick={() => onSegmentClick(4)}>severity-drilldown</button>
  ),
}))
vi.mock('../components/dashboard/NamespaceBreakdown', () => ({
  NamespaceBreakdown: ({ onBarClick }: { onBarClick: (namespace: string, severity: number) => void }) => (
    <button onClick={() => onBarClick('payments', 3)}>namespace-drilldown</button>
  ),
}))
vi.mock('../components/charts/TrendLine', () => ({ TrendLine: () => null }))
vi.mock('../components/charts/EpssRiskMatrix', () => ({ EpssRiskMatrix: () => null }))
vi.mock('../components/charts/ImageCveTimeline', () => ({ ImageCveTimeline: () => null }))
vi.mock('../components/dashboard/FixabilityDonut', () => ({ FixabilityDonut: () => null }))
vi.mock('../components/dashboard/FixFirstList', () => ({ FixFirstList: () => null }))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderAt(initialEntry: string, ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<>{ui}<LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  )
}

function currentLocation(): string {
  return screen.getByTestId('location').textContent ?? ''
}

function makeFixItem(): FixRollupItem {
  return {
    component_name: 'openssl',
    component_version: '3.0.7',
    operating_system: 'rhel:9',
    target_version: '3.0.9',
    fix_versions: ['3.0.9'],
    target_uncertain: false,
    total_cves: 1,
    fixable_cves: 1,
    prioritized_cves: 0,
    critical_cves: 0,
    max_severity: Severity.IMPORTANT,
    max_cvss: 7.5,
    max_epss: 0.1,
    affected_images: 1,
    affected_deployments: 1,
    namespaces: ['payments'],
    images: [{ image_id: 'sha256:abc', image_name: 'quay.io/app:1' }],
    cves: [
      {
        cve_id: 'CVE-2024-0001',
        severity: Severity.IMPORTANT,
        cvss: 7.5,
        epss_probability: 0.1,
        fixable: true,
        fixed_by: '3.0.9',
        fix_candidates: ['3.0.9'],
        has_priority: false,
      },
    ],
  }
}

function makeImageGroup(): ImageCveGroup {
  return {
    image_name: 'quay.io/app:1',
    image_id: 'sha256:abc',
    total_cves: 1,
    critical_cves: 0,
    high_cves: 1,
    medium_cves: 0,
    low_cves: 0,
    max_cvss: 7.5,
    max_epss: 0.1,
    fixable_cves: 1,
    affected_deployments: 1,
    namespaces: ['payments'],
    clusters: ['cluster-a'],
  }
}

function makeImageDetail(): ImageDetailType {
  return {
    image_id: 'sha256:abc',
    name_fullname: 'quay.io/app:1',
    name_registry: 'quay.io',
    name_remote: 'app',
    name_tag: '1',
    os: 'rhel:9',
    created: null,
    last_scanned: null,
    last_updated: null,
    docker_user: null,
    risk_score: 1,
    top_cvss: 7.5,
    component_count: 1,
    cve_count: 1,
    fixable_cves: 1,
    critical_cves: 0,
    high_cves: 1,
    medium_cves: 0,
    low_cves: 0,
    layers: [],
    cve_timeline: [],
    cves: [],
  }
}

function makeDashboard(): DashboardData {
  return {
    stat_total_cves: 5,
    stat_escalations: 0,
    stat_upcoming_escalations: 0,
    stat_fixable_critical_cves: 0,
    stat_open_risk_acceptances: 0,
    stat_fix_overdue_cves: 0,
    stat_in_remediation: 0,
    fix_overdue_threshold_days: 30,
    severity_distribution: [{ severity: Severity.CRITICAL, count: 5 }],
    cves_per_namespace: [{ namespace: 'payments', cluster_name: 'cluster-a', critical: 1, high: 1, medium: 1, low: 1, total: 4 }],
    priority_cves: [],
    high_epss_cves: [],
    cve_trend: [],
    epss_matrix: [],
    cluster_heatmap: [],
    aging_distribution: [],
    risk_acceptance_pipeline: { requested: 0, approved: 0, rejected: 0, expired: 0 },
    fixability_breakdown: { fixable: 0, unfixable: 0 },
    cve_history: [],
    mttr_by_severity: [],
    fix_first_cves: [],
  } as unknown as DashboardData
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCveFixes.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 200 }, isLoading: false, error: null })
  mockUseImageDetail.mockReturnValue({ data: makeImageDetail(), isLoading: false, error: null })
  mockUseDashboard.mockReturnValue({ data: makeDashboard(), isLoading: false, error: null })
})

describe('scope-preserving navigation', () => {
  it('image view: opening an image keeps the threshold opt-out', () => {
    renderAt(
      '/vulnerabilities?view=image&ignore_thresholds=1',
      <Table><ImageRow group={makeImageGroup()} scope={{ ignoreThresholds: true }} filters={{}} /></Table>,
    )

    fireEvent.click(screen.getByText('quay.io/app:1'))

    expect(currentLocation()).toBe('/images/sha256%3Aabc?ignore_thresholds=1')
  })

  it('component view: CVE and image links keep scope and the opt-out', () => {
    renderAt(
      '/vulnerabilities?view=component&cluster=cluster-a&ns=payments&ignore_thresholds=1',
      <ComponentFixTable items={[makeFixItem()]} />,
    )
    fireEvent.click(document.querySelector('button[aria-expanded]') as HTMLButtonElement)

    fireEvent.click(screen.getByText('quay.io/app:1'))
    expect(currentLocation()).toBe('/images/sha256%3Aabc?cluster=cluster-a&ns=payments&ignore_thresholds=1')
  })

  it('component view: CVE link keeps the opt-out', () => {
    renderAt('/vulnerabilities?view=component&ignore_thresholds=1', <ComponentFixTable items={[makeFixItem()]} />)
    fireEvent.click(document.querySelector('button[aria-expanded]') as HTMLButtonElement)

    fireEvent.click(screen.getByText('CVE-2024-0001'))

    expect(currentLocation()).toBe('/vulnerabilities/CVE-2024-0001?ignore_thresholds=1')
  })

  it('image detail: loads without the floor and returns to the image view with the opt-out', () => {
    renderAt('/images/sha256%3Aabc?ignore_thresholds=1', <Routes><Route path="/images/:imageId" element={<ImageDetail />} /></Routes>)

    expect(mockUseImageDetail).toHaveBeenCalledWith('sha256:abc', { ignoreThresholds: true })

    fireEvent.click(screen.getByText('imageDetail.breadcrumbByImage'))
    expect(currentLocation()).toBe('/vulnerabilities?view=image&ignore_thresholds=1')
  })

  it('image detail: CVE list breadcrumb keeps the opt-out', () => {
    renderAt('/images/sha256%3Aabc?ignore_thresholds=1', <Routes><Route path="/images/:imageId" element={<ImageDetail />} /></Routes>)

    fireEvent.click(screen.getByText('nav.cves'))

    expect(currentLocation()).toBe('/vulnerabilities?ignore_thresholds=1')
  })

  it('dashboard: chart drilldown keeps the opt-out', () => {
    renderAt('/dashboard?ignore_thresholds=1', <Dashboard />)

    expect(mockUseDashboard).toHaveBeenCalledWith(expect.objectContaining({ ignoreThresholds: true }))
    fireEvent.click(screen.getByText('severity-drilldown'))

    expect(currentLocation()).toBe('/vulnerabilities?severity=4&ignore_thresholds=1')
  })

  it('dashboard: namespace drilldown filters by ns and overrides the sidebar namespace', () => {
    renderAt('/dashboard?ns=billing&ignore_thresholds=1', <Dashboard />)

    fireEvent.click(screen.getByText('namespace-drilldown'))

    expect(currentLocation()).toBe('/vulnerabilities?ns=payments&severity=3&ignore_thresholds=1')
  })
})
