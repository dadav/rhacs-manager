import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { NotificationBell } from './NotificationBell'
import type { AppNotification } from '../../types'

// --- Stateful api mock: delete mutations mutate this state, GETs read it back,
// so optimistic cache updates and the invalidation refetch stay consistent. ---

let notifState: AppNotification[] = []
let unreadState = 0

const apiGet = vi.fn(async (path: string) =>
  path.endsWith('unread-count') ? { count: unreadState } : notifState,
)
const apiPost = vi.fn(async () => undefined)
const apiPatch = vi.fn(async () => undefined)
const apiDelete = vi.fn(async (path: string) => {
  if (path === '/notifications') {
    notifState = []
    unreadState = 0
    return undefined
  }
  const id = path.split('/').pop()
  const target = notifState.find(n => n.id === id)
  if (target && !target.read) unreadState = Math.max(0, unreadState - 1)
  notifState = notifState.filter(n => n.id !== id)
  return undefined
})

vi.mock('../../api/client', () => ({
  api: {
    get: (path: string) => apiGet(path),
    post: (path: string) => apiPost(path),
    patch: (path: string) => apiPatch(path),
    delete: (path: string) => apiDelete(path),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockAddToast = vi.fn()
vi.mock('../ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

function makeNotif(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'mention' as AppNotification['type'],
    title: 'First title',
    message: 'first message',
    link: '/cves/CVE-2024-0001',
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function renderBell() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openDrawer() {
  fireEvent.click(screen.getByLabelText('notifications.title'))
  await screen.findByText('First title')
}

beforeEach(() => {
  vi.clearAllMocks()
  notifState = [
    makeNotif({ id: 'n1', title: 'First title', read: false }),
    makeNotif({ id: 'n2', title: 'Second title', read: true, link: null }),
  ]
  unreadState = 1
})

describe('NotificationBell', () => {
  it('renders a delete action with an accessible label for each item', async () => {
    renderBell()
    await openDrawer()
    const deleteButtons = screen.getAllByLabelText('notifications.deleteAriaLabel')
    expect(deleteButtons).toHaveLength(2)
  })

  it('keeps localized unread status and bulk actions in the responsive drawer body', async () => {
    renderBell()
    await openDrawer()

    for (const actionKey of ['notifications.unreadCount', 'notifications.markAllRead', 'notifications.clearAll']) {
      expect(screen.getByText(actionKey).closest('.pf-v6-c-notification-drawer__body')).not.toBeNull()
    }
  })

  it('deletes a single notification without navigating or marking read', async () => {
    renderBell()
    await openDrawer()
    const deleteButtons = screen.getAllByLabelText('notifications.deleteAriaLabel')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/notifications/n1'))
    // Propagation stopped: no navigation, no mark-read PATCH.
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(apiPatch).not.toHaveBeenCalled()
    expect(mockAddToast).toHaveBeenCalledWith('notifications.deleted')
    await waitFor(() => expect(screen.queryByText('First title')).not.toBeInTheDocument())
  })

  it('decrements the unread badge after deleting an unread notification', async () => {
    renderBell()
    await openDrawer()
    expect(await screen.findByText('1')).toBeInTheDocument()
    fireEvent.click(screen.getAllByLabelText('notifications.deleteAriaLabel')[0])
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument())
  })

  it('requires confirmation before clearing all and can be cancelled', async () => {
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.clearAll'))
    const confirmation = screen.getByText('notifications.clearAllConfirm')
    expect(confirmation).toBeInTheDocument()
    expect(confirmation.closest('.pf-v6-c-notification-drawer__body')).not.toBeNull()

    fireEvent.click(screen.getByText('notifications.clearAllCancel'))
    expect(screen.queryByText('notifications.clearAllConfirm')).not.toBeInTheDocument()
    expect(apiDelete).not.toHaveBeenCalled()
  })

  it('resets bulk confirmation when the drawer closes', async () => {
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.clearAll'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByLabelText('notifications.title'))

    expect(await screen.findByText('notifications.clearAll')).toBeInTheDocument()
    expect(screen.queryByText('notifications.clearAllConfirm')).not.toBeInTheDocument()
  })

  it('clears all notifications after confirmation, keeps the drawer open with the empty state', async () => {
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.clearAll'))
    fireEvent.click(screen.getByText('notifications.clearAllConfirmButton'))

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/notifications'))
    expect(mockAddToast).toHaveBeenCalledWith('notifications.cleared')
    // Drawer stays open and shows the empty state.
    expect(await screen.findByText('notifications.noNotifications')).toBeInTheDocument()
  })

  it('retains mark-all-read behavior', async () => {
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.markAllRead'))
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/notifications/read-all'))
  })

  it('shows an inline error and keeps the item when deletion fails', async () => {
    apiDelete.mockRejectedValueOnce(new Error('boom'))
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getAllByLabelText('notifications.deleteAriaLabel')[0])

    expect(await screen.findByText('notifications.deleteFailed')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    // Failed item stays visible.
    expect(screen.getByText('First title')).toBeInTheDocument()
  })

  it('shows an operation-specific inline error when clearing fails', async () => {
    apiDelete.mockRejectedValueOnce(new Error('clear boom'))
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.clearAll'))
    fireEvent.click(screen.getByText('notifications.clearAllConfirmButton'))

    expect(await screen.findByText('notifications.clearFailed')).toBeInTheDocument()
    expect(screen.getByText('clear boom')).toBeInTheDocument()
    expect(screen.getByText('First title')).toBeInTheDocument()
  })

  it('disables deletion controls while a single delete is pending', async () => {
    apiDelete.mockImplementationOnce(() => new Promise(() => {}))
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getAllByLabelText('notifications.deleteAriaLabel')[0])

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/notifications/n1'))
    for (const button of screen.getAllByLabelText('notifications.deleteAriaLabel')) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByRole('button', { name: 'notifications.clearAll' })).toBeDisabled()
  })

  it('disables deletion controls while clear all is pending', async () => {
    apiDelete.mockImplementationOnce(() => new Promise(() => {}))
    renderBell()
    await openDrawer()
    fireEvent.click(screen.getByText('notifications.clearAll'))
    fireEvent.click(screen.getByText('notifications.clearAllConfirmButton'))

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/notifications'))
    expect(screen.getByRole('button', { name: 'notifications.clearAllConfirmButton' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'notifications.clearAllCancel' })).toBeDisabled()
    for (const button of screen.getAllByLabelText('notifications.deleteAriaLabel')) {
      expect(button).toBeDisabled()
    }
  })
})
