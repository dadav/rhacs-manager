import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { Remediations } from './Remediations'
import { RemediationStatus } from '../types'
import type { RemediationItem } from '../types'

const mockPatch = vi.fn()
const mockGet = vi.fn()
vi.mock('../api/client', () => ({
  api: {
    patch: (...args: unknown[]) => mockPatch(...args),
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockAddToast = vi.fn()
vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-1' } }),
}))

vi.mock('../hooks/useScope', () => ({
  useScope: () => ({ scopeParams: {} }),
  useScopedLink: () => (to: string) => to,
}))

vi.mock('../api/auth', () => ({
  useUserSearch: () => ({
    isLoading: false,
    data: [{ id: 'teammate-1', username: 'teammate', full_name: 'Team Mate', display_name: 'Team Mate' }],
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

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
    wont_fix_reason: null,
    auto_resolved: false,
    resolved_at: null,
    verified_at: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    is_overdue: false,
    ...overrides,
  }
}

function renderPage(item: RemediationItem) {
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith('/remediations/stats') ? {} : [item]),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Remediations />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Remediations row actions', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    mockPatch.mockResolvedValue({})
    mockGet.mockReset()
    mockAddToast.mockReset()
  })

  it.each([
    [RemediationStatus.resolved, 'in_progress'],
    [RemediationStatus.verified, 'in_progress'],
    [RemediationStatus.wont_fix, 'open'],
  ])('offers reopen on a %s remediation and sends %s', async (status, target) => {
    renderPage(makeItem({ status }))

    fireEvent.click(await screen.findByRole('button', { name: 'remediations.reopen' }))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { status: target }))
  })

  it('edits from the row and confirms with a toast', async () => {
    renderPage(makeItem())

    fireEvent.click(await screen.findByRole('button', { name: 'common.edit' }))
    fireEvent.change(await screen.findByLabelText('cveDetail.notes'), { target: { value: 'New plan' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { notes: 'New plan' }))
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('toast.remediationUpdated'))
  })

  it('labels an automatically resolved remediation', async () => {
    renderPage(makeItem({ status: RemediationStatus.resolved, auto_resolved: true }))

    expect(await screen.findByText('cveDetail.autoResolved')).toBeInTheDocument()
  })

  it('shows the reason for a wont_fix row', async () => {
    const reason = 'Component is removed next sprint'
    renderPage(makeItem({ status: RemediationStatus.wont_fix, wont_fix_reason: reason }))

    expect(await screen.findByText(reason)).toHaveAttribute('title', reason)
  })

  it('keeps status actions usable after assigning from the row', async () => {
    renderPage(makeItem())

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.assign' }))
    fireEvent.mouseDown(await screen.findByRole('option'))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { assigned_to: 'teammate-1' }))
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('toast.remediationUpdated'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'remediations.start' })).toBeEnabled())
  })

  it('keeps status actions usable after unassigning from the row', async () => {
    renderPage(makeItem({ assigned_to: 'teammate-1', assigned_to_name: 'Team Mate' }))

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.unassign' }))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { assigned_to: null }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'remediations.start' })).toBeEnabled())
  })

  it('shows a failed assignment in the row', async () => {
    mockPatch.mockRejectedValue(new Error('assign failed'))
    renderPage(makeItem({ assigned_to: 'teammate-1', assigned_to_name: 'Team Mate' }))

    fireEvent.click(await screen.findByRole('button', { name: 'cveDetail.unassign' }))

    expect(await screen.findByText(/assign failed/)).toBeInTheDocument()
    expect(mockAddToast).not.toHaveBeenCalled()
  })

  it.each([RemediationStatus.resolved, RemediationStatus.wont_fix])('offers no edit on %s', async (status) => {
    renderPage(makeItem({ status, assigned_to: 'teammate-1', assigned_to_name: 'Team Mate' }))

    await screen.findByText('CVE-2024-0001')
    expect(screen.queryByRole('button', { name: 'common.edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'cveDetail.reassign' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'cveDetail.unassign' })).toBeNull()
  })
})
