import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CveRemediationSection, RemediationCard } from './CveRemediation'
import { RemediationStatus } from '../types'
import type { RemediationItem } from '../types'

// --- Mocks ---

const mockPatch = vi.fn()
const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../api/client', () => ({
  api: {
    patch: (...args: unknown[]) => mockPatch(...args),
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: vi.fn(),
  },
}))

// Small cap keeps the over-the-cap test fast; the real value is 200.
vi.mock('../api/remediations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/remediations')>()),
  MAX_REMEDIATION_TARGETS: 2,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isSecTeam: false }),
}))

vi.mock('../hooks/useScope', () => ({
  useScope: () => ({ scopeParams: {} }),
}))

vi.mock('../api/auth', () => ({
  useUserSearch: () => ({
    isLoading: false,
    data: [{ id: 'teammate-1', username: 'teammate', full_name: 'Team Mate', display_name: 'Team Mate' }],
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => (opts?.count !== undefined ? `${key}:${opts.count}` : key),
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

// --- Helpers ---

function makeItem(overrides: Partial<RemediationItem> = {}): RemediationItem {
  return {
    id: 'rem-1',
    cve_id: 'CVE-2024-0001',
    namespace: 'payments',
    cluster_name: 'cluster-a',
    status: RemediationStatus.open,
    assigned_to: null,
    assigned_to_name: null,
    created_by: 'test-user-1',
    created_by_name: 'Test User',
    resolved_by: null,
    resolved_by_name: null,
    target_date: null,
    notes: null,
    resolved_at: null,
    verified_at: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    is_overdue: false,
    ...overrides,
  }
}

function renderCard(item: RemediationItem) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const labels = { open: 'open', in_progress: 'in_progress', resolved: 'resolved', wont_fix: 'wont_fix' }
  const ui = (i: RemediationItem) => (
    <QueryClientProvider client={queryClient}>
      <RemediationCard item={i} remStatusLabels={labels} />
    </QueryClientProvider>
  )
  const result = render(ui(item))
  return { ...result, rerenderWith: (i: RemediationItem) => result.rerender(ui(i)) }
}

// --- Tests ---

describe('RemediationCard assignment', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    mockPatch.mockResolvedValue({})
  })

  it('keeps status actions usable after assigning, so a status change can follow', async () => {
    const { rerenderWith } = renderCard(makeItem())

    fireEvent.click(screen.getByRole('button', { name: 'cveDetail.assign' }))
    fireEvent.mouseDown(await screen.findByRole('option'))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { assigned_to: 'teammate-1' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // Refetched item: assignee changed, status unchanged.
    rerenderWith(makeItem({ assigned_to: 'teammate-1', assigned_to_name: 'Team Mate' }))

    const startButton = screen.getByRole('button', { name: 'cveDetail.start' })
    await waitFor(() => expect(startButton).toBeEnabled())
    expect(screen.getByRole('button', { name: 'cveDetail.reassign' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'cveDetail.wontFix' })).toBeEnabled()

    fireEvent.click(startButton)
    await waitFor(() => expect(mockPatch).toHaveBeenLastCalledWith('/remediations/rem-1', { status: 'in_progress' }))
  })

  it('shows a failed assignment after the modal has closed', async () => {
    mockPatch.mockRejectedValue(new Error('assign failed'))
    renderCard(makeItem())

    fireEvent.click(screen.getByRole('button', { name: 'cveDetail.assign' }))
    fireEvent.mouseDown(await screen.findByRole('option'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/assign failed/)).toBeInTheDocument()
  })
})

describe('CveRemediationSection multi-namespace create', () => {
  const deployments = [
    { namespace: 'payments', cluster_name: 'cluster-a' },
    { namespace: 'payments', cluster_name: 'cluster-a' },
    { namespace: 'frontend', cluster_name: 'cluster-b' },
    { namespace: 'billing', cluster_name: 'cluster-a' },
  ]

  function renderSection(existing: RemediationItem[] = []) {
    mockGet.mockResolvedValue(existing)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <CveRemediationSection cveId="CVE-2024-0001" deployments={deployments} />
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPost.mockResolvedValue([])
  })

  it('creates remediations for every checked namespace in one batch request', async () => {
    renderSection()

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.startRemediationBtn' }))
    const submit = screen.getByRole('button', { name: 'cveDetail.createRemediationsBtn:0' })
    expect(submit).toBeDisabled()

    fireEvent.click(screen.getByLabelText('cluster-a/payments'))
    fireEvent.click(screen.getByLabelText('cluster-b/frontend'))
    fireEvent.click(screen.getByRole('button', { name: 'cveDetail.createRemediationsBtn:2' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/remediations/batch', {
      cve_id: 'CVE-2024-0001',
      targets: [
        { namespace: 'payments', cluster_name: 'cluster-a' },
        { namespace: 'frontend', cluster_name: 'cluster-b' },
      ],
      target_date: null,
      notes: null,
      assigned_to: null,
    }))
  })

  it('keeps the assignee trigger mounted and focused after selecting a user', async () => {
    renderSection()

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.startRemediationBtn' }))
    const trigger = screen.getByRole('button', { name: 'riskAcceptance.selectUser' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.mouseDown(await screen.findByRole('option'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('@teammate')).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('select all covers only namespaces without an existing remediation', async () => {
    renderSection([makeItem({ namespace: 'billing', cluster_name: 'cluster-a' })])

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.startRemediationBtn' }))
    expect(screen.queryByLabelText('cluster-a/billing')).toBeNull()

    fireEvent.click(screen.getByLabelText('cveDetail.selectAllNamespaces:2'))
    fireEvent.click(screen.getByRole('button', { name: 'cveDetail.createRemediationsBtn:2' }))

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1))
    expect(mockPost.mock.calls[0][1].targets).toEqual([
      { namespace: 'payments', cluster_name: 'cluster-a' },
      { namespace: 'frontend', cluster_name: 'cluster-b' },
    ])
  })

  it('blocks submit above the batch cap', async () => {
    mockGet.mockResolvedValue([])
    const many = Array.from({ length: 3 }, (_, i) => ({ namespace: `ns-${i}`, cluster_name: 'cluster-a' }))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <CveRemediationSection cveId="CVE-2024-0001" deployments={many} />
      </QueryClientProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.startRemediationBtn' }))
    fireEvent.click(screen.getByLabelText('cveDetail.selectAllNamespaces:3'))

    expect(screen.getByText('cveDetail.tooManyNamespaces')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'cveDetail.createRemediationsBtn:3' })).toBeDisabled()
  })
})
