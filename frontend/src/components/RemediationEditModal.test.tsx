import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RemediationEditModal } from './RemediationEditModal'
import { RemediationStatus } from '../types'
import type { RemediationItem } from '../types'

const mockPatch = vi.fn()
vi.mock('../api/client', () => ({
  api: {
    patch: (...args: unknown[]) => mockPatch(...args),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
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
    target_date: '2026-11-20',
    notes: 'Original note',
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

const onSaved = vi.fn()

function Harness({ item }: { item: RemediationItem }) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button onClick={() => setIsOpen(true)}>reopen-modal</button>
      <RemediationEditModal item={item} isOpen={isOpen} onClose={() => setIsOpen(false)} onSaved={onSaved} />
    </>
  )
}

function renderModal(item: RemediationItem) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness item={item} />
    </QueryClientProvider>,
  )
}

const saveButton = () => screen.getByRole('button', { name: 'common.save' })
const dateInput = () => screen.getByLabelText('cveDetail.targetDate')
const notesInput = () => screen.getByLabelText('cveDetail.notes')

describe('RemediationEditModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12))
    mockPatch.mockReset()
    mockPatch.mockResolvedValue({})
    onSaved.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends only the changed date', async () => {
    renderModal(makeItem())

    fireEvent.change(await waitFor(dateInput), { target: { value: '2026-12-24' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { target_date: '2026-12-24' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('sends only the changed notes', async () => {
    renderModal(makeItem())

    fireEvent.change(await waitFor(notesInput), { target: { value: 'New plan' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { notes: 'New plan' }))
  })

  it('removing the date sends null', async () => {
    renderModal(makeItem())

    fireEvent.click(await screen.findByRole('button', { name: 'common.remove' }))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { target_date: null }))
  })

  it('emptying the notes sends null', async () => {
    renderModal(makeItem())

    fireEvent.change(await waitFor(notesInput), { target: { value: '   ' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { notes: null }))
  })

  it('disables save when nothing changed', async () => {
    renderModal(makeItem())

    await waitFor(() => expect(dateInput()).toHaveValue('2026-11-20'))
    expect(saveButton()).toBeDisabled()
  })

  it('blocks a changed date in the past and allows today', async () => {
    renderModal(makeItem())

    fireEvent.change(await waitFor(dateInput), { target: { value: '2026-11-05' } })
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText('remediations.targetDatePast')).toBeInTheDocument()

    fireEvent.change(dateInput(), { target: { value: '2026-11-06' } })
    expect(saveButton()).toBeEnabled()
    expect(screen.queryByText('remediations.targetDatePast')).toBeNull()
  })

  it('allows a notes edit while the unchanged date is overdue', async () => {
    renderModal(makeItem({ target_date: '2026-11-01', is_overdue: true }))

    fireEvent.change(await waitFor(notesInput), { target: { value: 'Blocked by vendor' } })
    expect(screen.queryByText('remediations.targetDatePast')).toBeNull()
    fireEvent.click(saveButton())

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/remediations/rem-1', { notes: 'Blocked by vendor' }))
  })

  it('keeps the modal open and shows the error when saving fails', async () => {
    mockPatch.mockRejectedValue(new Error('save failed'))
    renderModal(makeItem())

    fireEvent.change(await waitFor(notesInput), { target: { value: 'New plan' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText(/save failed/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(notesInput()).toHaveValue('New plan')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('discards the draft when cancelled and reopened', async () => {
    renderModal(makeItem())

    fireEvent.change(await waitFor(notesInput), { target: { value: 'Abandoned draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByText('reopen-modal'))

    await waitFor(() => expect(notesInput()).toHaveValue('Original note'))
    expect(mockPatch).not.toHaveBeenCalled()
  })
})
