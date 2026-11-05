import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MySettings } from './MySettings'

const mockMutate = vi.fn()
vi.mock('../api/preferences', () => ({
  useNotificationPreferences: () => ({
    data: {
      items: [
        { category: 'remediation', in_app: true, email: false },
        { category: 'priority', in_app: true, email: false },
        { category: 'in_app_only', in_app: true, email: null },
        { category: 'team_digest', in_app: null, email: false },
      ],
      team_notifications_active: true,
    },
    isLoading: false,
    error: null,
  }),
  useUpdateNotificationPreferences: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}))

vi.mock('../components/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', changeLanguage: vi.fn() } }),
}))

describe('MySettings', () => {
  beforeEach(() => mockMutate.mockReset())

  it('renders a switch only for channels that exist', () => {
    render(<MySettings />)
    expect(screen.getAllByRole('switch')).toHaveLength(6)
    expect(screen.queryByRole('switch', { name: 'mySettings.category.in_app_only: mySettings.email' })).toBeNull()
    expect(screen.queryByRole('switch', { name: 'mySettings.category.team_digest: mySettings.in_app' })).toBeNull()
  })

  it('opting into the team digest sends only that category and channel', () => {
    render(<MySettings />)
    fireEvent.click(screen.getByRole('switch', { name: 'mySettings.category.team_digest: mySettings.email' }))
    expect(mockMutate.mock.calls[0][0]).toEqual([{ category: 'team_digest', in_app: null, email: true }])
  })

  it('a merged row sends each switch with its own channel', () => {
    render(<MySettings />)
    fireEvent.click(screen.getByRole('switch', { name: 'mySettings.category.priority: mySettings.email' }))
    expect(mockMutate.mock.calls[0][0]).toEqual([{ category: 'priority', in_app: true, email: true }])
    fireEvent.click(screen.getByRole('switch', { name: 'mySettings.category.priority: mySettings.in_app' }))
    expect(mockMutate.mock.calls[1][0]).toEqual([{ category: 'priority', in_app: false, email: false }])
  })

  it('turning on the remediation email keeps the in-app setting', () => {
    render(<MySettings />)
    fireEvent.click(screen.getByRole('switch', { name: 'mySettings.category.remediation: mySettings.email' }))
    expect(mockMutate.mock.calls[0][0]).toEqual([{ category: 'remediation', in_app: true, email: true }])
  })
})
