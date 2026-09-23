import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RemediationCard } from './CveRemediation'
import { RemediationStatus } from '../types'
import type { RemediationItem } from '../types'

// --- Mocks ---

const mockPatch = vi.fn()
vi.mock('../api/client', () => ({
  api: {
    patch: (...args: unknown[]) => mockPatch(...args),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../api/auth', () => ({
  useUserSearch: () => ({
    data: [{ id: 'teammate-1', username: 'teammate', full_name: 'Team Mate', display_name: 'Team Mate' }],
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
    fireEvent.focus(screen.getByRole('textbox', { name: 'cveDetail.assign' }))
    fireEvent.mouseDown(screen.getByRole('option'))

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { assigned_to: 'teammate-1' }))

    // Refetched item: assignee changed, status unchanged.
    rerenderWith(makeItem({ assigned_to: 'teammate-1', assigned_to_name: 'Team Mate' }))

    const startButton = screen.getByRole('button', { name: 'cveDetail.start' })
    await waitFor(() => expect(startButton).toBeEnabled())
    expect(screen.getByRole('button', { name: 'cveDetail.reassign' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'cveDetail.wontFix' })).toBeEnabled()

    fireEvent.click(startButton)
    await waitFor(() => expect(mockPatch).toHaveBeenLastCalledWith('/remediations/rem-1', { status: 'in_progress' }))
  })
})
