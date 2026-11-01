import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CveSubscribeButton } from './CveSubscribeButton'

const mockUseCveSubscription = vi.fn()
const mockMutate = vi.fn()
const mockUseSetCveSubscription = vi.fn()
vi.mock('../api/subscriptions', () => ({
  useCveSubscription: (...args: unknown[]) => mockUseCveSubscription(...args),
  useSetCveSubscription: (...args: unknown[]) => mockUseSetCveSubscription(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.message ? `${key}: ${opts.message}` : key),
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSetCveSubscription.mockReturnValue({ mutate: mockMutate, isPending: false, isError: false, error: null })
})

describe('CveSubscribeButton', () => {
  it('subscribes when not yet subscribed', () => {
    mockUseCveSubscription.mockReturnValue({ data: { cve_id: 'CVE-1', subscribed: false }, isLoading: false })

    render(<CveSubscribeButton cveId="CVE-1" />)
    const button = screen.getByRole('button', { name: /subscription.subscribe/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)

    expect(mockUseCveSubscription).toHaveBeenCalledWith('CVE-1')
    expect(mockMutate).toHaveBeenCalledWith(true)
  })

  it('unsubscribes when already subscribed', () => {
    mockUseCveSubscription.mockReturnValue({ data: { cve_id: 'CVE-1', subscribed: true }, isLoading: false })

    render(<CveSubscribeButton cveId="CVE-1" />)
    const button = screen.getByRole('button', { name: /subscription.subscribed/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button)

    expect(mockMutate).toHaveBeenCalledWith(false)
  })

  it('shows the API error', () => {
    mockUseCveSubscription.mockReturnValue({ data: { cve_id: 'CVE-1', subscribed: false }, isLoading: false })
    mockUseSetCveSubscription.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
      error: new Error('CVE not found'),
    })

    render(<CveSubscribeButton cveId="CVE-1" />)

    expect(screen.getByText(/subscription.error: CVE not found/)).toBeInTheDocument()
  })
})
