import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { Escalations } from './Escalations'
import type { ActiveEscalationRow, ActiveSearchResponse } from '../types'

// --- Mocks ---

const mockUseActive = vi.fn()
const mockUseUpcoming = vi.fn()
const mockMutateAsync = vi.fn()
vi.mock('../api/escalations', () => ({
  useActiveEscalationSearch: (...args: unknown[]) => mockUseActive(...args),
  useUpcomingEscalationSearch: (...args: unknown[]) => mockUseUpcoming(...args),
  useAddEscalationComment: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

const mockAddToast = vi.fn()
vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

let isSecTeamValue = true
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isSecTeam: isSecTeamValue }),
}))

vi.mock('../hooks/useScope', () => ({
  useScope: () => ({ scopeParams: {} }),
}))

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (val: unknown) => val,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('../components/TableSkeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton" />,
}))

type MockSeg = { type: string; text?: string }

vi.mock('../components/MentionTextArea', () => ({
  MentionTextArea: ({
    value,
    onChange,
    placeholder,
  }: {
    value: MockSeg[]
    onChange: (v: MockSeg[]) => void
    placeholder?: string
  }) => (
    <textarea
      aria-label="composer"
      value={value.map(s => s.text ?? '').join('')}
      placeholder={placeholder}
      onChange={e => onChange([{ type: 'text', text: e.target.value }])}
    />
  ),
  contentToApi: (segs: MockSeg[]) => segs,
  contentIsEmpty: (segs: MockSeg[]) => !segs.some(s => (s.text ?? '').trim() !== ''),
}))

// --- Helpers ---

function makeRow(overrides: Partial<ActiveEscalationRow> = {}): ActiveEscalationRow {
  return {
    id: 'esc-1',
    cve_id: 'CVE-2024-0001',
    namespace: 'ns1',
    cluster_name: 'c1',
    level: 2,
    triggered_at: '2026-01-01T00:00:00Z',
    notified: true,
    contacted: false,
    ...overrides,
  }
}

function activeResp(overrides: Partial<ActiveSearchResponse> = {}): ActiveSearchResponse {
  return {
    items: [makeRow()],
    total: 1,
    page: 1,
    page_size: 20,
    contact_counts: { needs_action: 1, contacted: 0 },
    ...overrides,
  }
}

function wrapper(initialPath = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function LocationProbe() {
    const location = useLocation()
    return <span data-testid="location-search">{location.search}</span>
  }
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          {children}
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  isSecTeamValue = true
  mockUseUpcoming.mockReturnValue({
    data: { items: [], total: 0, page: 1, page_size: 20 },
    isLoading: false,
    error: null,
  })
  mockUseActive.mockReturnValue({ data: activeResp(), isLoading: false, error: null })
})

describe('Escalations', () => {
  it('defaults sec-team users to the Needs action contact filter', () => {
    render(<Escalations />, { wrapper: wrapper() })
    const call = mockUseActive.mock.calls.at(-1)![0] as { contact_status?: string }
    expect(call.contact_status).toBe('needs_action')
  })

  it('regular users get all rows and no contact controls', () => {
    isSecTeamValue = false
    render(<Escalations />, { wrapper: wrapper() })
    const call = mockUseActive.mock.calls.at(-1)![0] as { contact_status?: string }
    expect(call.contact_status).toBeUndefined()
    // No sec-only contact status column header.
    expect(screen.queryByText('escalations.contactStatus')).not.toBeInTheDocument()
  })

  it('renders active rows and the visible count', () => {
    render(<Escalations />, { wrapper: wrapper() })
    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
    expect(screen.getByText('escalations.activeVisibleCount')).toBeInTheDocument()
  })

  it('keeps a collapsed escalation row visible', () => {
    render(<Escalations />, { wrapper: wrapper() })
    const escalationRow = screen.getByText('CVE-2024-0001').closest('tr')
    expect(escalationRow).not.toHaveAttribute('hidden')
  })

  it('shows the hidden-by-contact count when contacted rows are filtered out', () => {
    mockUseActive.mockReturnValue({
      data: activeResp({ contact_counts: { needs_action: 1, contacted: 3 } }),
      isLoading: false,
      error: null,
    })
    render(<Escalations />, { wrapper: wrapper() })
    expect(screen.getByText('escalations.hiddenByContact')).toBeInTheDocument()
  })

  it('shows an all-caught-up state when nothing needs action but contacted rows are hidden', () => {
    mockUseActive.mockReturnValue({
      data: activeResp({ items: [], total: 0, contact_counts: { needs_action: 0, contacted: 4 } }),
      isLoading: false,
      error: null,
    })
    render(<Escalations />, { wrapper: wrapper() })
    expect(screen.getByText('escalations.allContacted')).toBeInTheDocument()
  })

  it('reflects a level filter from the URL as a chip', () => {
    render(<Escalations />, { wrapper: wrapper('/?level=2') })
    const call = mockUseActive.mock.calls.at(-1)![0] as { level?: string }
    expect(call.level).toBe('2')
  })

  it('passes upcoming URL filters and pagination to the query', () => {
    render(<Escalations />, { wrapper: wrapper('/?up_search=CVE-1&up_level=3&up_severity=4&up_days=7&up_page=2') })
    const call = mockUseUpcoming.mock.calls.at(-1)![0] as Record<string, string | number | undefined>
    expect(call).toMatchObject({
      search: 'CVE-1',
      next_level: '3',
      severity: '4',
      days_max: '7',
      page: 2,
    })
  })

  it('clear all removes active filters and explicitly selects all contact states', async () => {
    render(<Escalations />, { wrapper: wrapper('/?level=2&email_status=notified&contact=contacted&page=3') })
    const clearButtons = screen.getAllByText('common.clearAll')
    fireEvent.click(clearButtons.at(-1)!)

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? ''
      expect(search).toContain('contact=all')
      expect(search).not.toContain('level=')
      expect(search).not.toContain('email_status=')
      expect(search).not.toContain('page=')
    })
  })

  it('records contact through the inline composer and removes the row', async () => {
    render(<Escalations />, { wrapper: wrapper() })
    // Expand the row.
    fireEvent.click(screen.getByLabelText('escalations.expandRow'))
    // Type a note.
    fireEvent.change(screen.getByLabelText('composer'), { target: { value: 'contacted the team' } })
    // Submit.
    fireEvent.click(screen.getByText('escalations.recordContact'))

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        escalationId: 'esc-1',
        payload: { content: [{ type: 'text', text: 'contacted the team' }] },
      }),
    )
    expect(mockAddToast).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('CVE-2024-0001')).not.toBeInTheDocument())
  })

  it('keeps a contacted row visible in the all-contact-states view', async () => {
    render(<Escalations />, { wrapper: wrapper('/?contact=all') })
    fireEvent.click(screen.getByLabelText('escalations.expandRow'))
    fireEvent.change(screen.getByLabelText('composer'), { target: { value: 'contacted the team' } })
    fireEvent.click(screen.getByText('escalations.recordContact'))

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
  })

  it('keeps the draft and shows an error when the composer submit fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('boom'))
    render(<Escalations />, { wrapper: wrapper() })
    fireEvent.click(screen.getByLabelText('escalations.expandRow'))
    fireEvent.change(screen.getByLabelText('composer'), { target: { value: 'draft text' } })
    fireEvent.click(screen.getByText('escalations.recordContact'))

    await waitFor(() => expect((screen.getByLabelText('composer') as HTMLTextAreaElement).value).toBe('draft text'))
    // Row still present.
    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
  })
})
