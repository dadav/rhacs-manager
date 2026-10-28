import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { MyComments } from './MyComments'
import type { CveComment, MyCommentThread, Paginated } from '../types'

// --- Mocks ---

const mockUseMyComments = vi.fn()
vi.mock('../api/comments', () => ({
  useMyComments: (...args: unknown[]) => mockUseMyComments(...args),
}))

const mockUseCveComments = vi.fn()
vi.mock('../api/cves', () => ({
  useCveComments: (...args: unknown[]) => mockUseCveComments(...args),
}))

const mockUseRiskComments = vi.fn()
vi.mock('../api/riskAcceptances', () => ({
  useRiskComments: (...args: unknown[]) => mockUseRiskComments(...args),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, isSecTeam: false }),
}))

vi.mock('../hooks/useScope', () => ({
  useScopedLink: () => (to: string) => `${to}?cluster=c1`,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.count !== undefined ? `${key}:${opts.count}` : key),
    i18n: { language: 'en' },
  }),
}))

vi.mock('../components/MentionTextArea', () => ({
  renderContent: (_content: unknown, message: string) => message,
}))

vi.mock('../components/TableSkeleton', () => ({
  TableSkeletonRows: () => null,
}))

// --- Helpers ---

function makeThread(overrides: Partial<MyCommentThread> = {}): MyCommentThread {
  return {
    kind: 'cve',
    cve_id: 'CVE-2026-0001',
    risk_acceptance_id: null,
    escalation_context: null,
    my_comment_count: 1,
    my_last_comment_id: 'c-mine',
    my_last_comment_at: '2026-10-01T12:00:00',
    my_last_message: 'my text',
    my_last_content: null,
    replies_since: 0,
    last_reply_at: null,
    last_reply_by_name: null,
    thread_available: true,
    detail_available: true,
    detail_link: '/vulnerabilities/CVE-2026-0001',
    ...overrides,
  }
}

function page(items: MyCommentThread[]): { data: Paginated<MyCommentThread>; isLoading: false; error: null } {
  return { data: { items, total: items.length, page: 1, page_size: 25 }, isLoading: false, error: null }
}

function comment(overrides: Partial<CveComment>): CveComment {
  return {
    id: 'x',
    cve_id: 'CVE-2026-0001',
    user_id: 'alice',
    username: 'alice',
    display_name: 'Alice',
    message: 'hi',
    content: null,
    created_at: '2026-10-01T12:00:00',
    updated_at: null,
    is_sec_team: false,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyComments />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockUseMyComments.mockReset()
  mockUseCveComments.mockReset()
  mockUseRiskComments.mockReset()
  mockUseCveComments.mockReturnValue({ data: [], isLoading: false, error: null })
  mockUseRiskComments.mockReturnValue({ data: [], isLoading: false, error: null })
})

describe('MyComments', () => {
  it('renders a row with the new-replies badge and a scoped, anchored detail link', () => {
    mockUseMyComments.mockReturnValue(
      page([makeThread({ replies_since: 2, last_reply_at: '2026-10-02T09:00:00', last_reply_by_name: 'Alice' })]),
    )
    renderPage()

    const row = screen.getByTestId('my-comments-row')
    expect(within(row).getByText('myComments.newReplies:2')).toBeInTheDocument()
    expect(within(row).getByText('my text')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'myComments.open' })).toHaveAttribute(
      'href',
      '/vulnerabilities/CVE-2026-0001?cluster=c1#comment-c-mine',
    )
  })

  it('shows the thread inline when the CVE detail is no longer available', () => {
    mockUseMyComments.mockReturnValue(
      page([makeThread({ detail_available: false, detail_link: null, replies_since: 1 })]),
    )
    mockUseCveComments.mockReturnValue({
      data: [
        comment({ id: 'c-mine', user_id: 'me', display_name: 'Me', message: 'my text' }),
        comment({ id: 'c-reply', message: 'answer from alice', created_at: '2026-10-01T13:00:00' }),
      ],
      isLoading: false,
      error: null,
    })
    renderPage()

    const row = screen.getByTestId('my-comments-row')
    expect(within(row).queryByRole('link')).toBeNull()
    expect(within(row).getByText('myComments.detailUnavailable')).toBeInTheDocument()

    fireEvent.click(within(row).getByRole('button', { name: 'myComments.showThread' }))

    expect(mockUseCveComments).toHaveBeenCalledWith('CVE-2026-0001')
    const thread = screen.getByTestId('my-comments-thread')
    expect(within(thread).getByText('answer from alice')).toBeInTheDocument()
    // Only the reply after my last comment is marked new.
    expect(within(thread).getAllByText('myComments.newReplies:1')).toHaveLength(1)
  })

  it('offers no expansion and no link for an inaccessible risk acceptance', () => {
    mockUseMyComments.mockReturnValue(
      page([
        makeThread({
          kind: 'risk_acceptance',
          risk_acceptance_id: 'ra-1',
          thread_available: false,
          detail_available: false,
          detail_link: null,
        }),
      ]),
    )
    renderPage()

    const row = screen.getByTestId('my-comments-row')
    expect(within(row).queryByRole('button', { name: 'myComments.showThread' })).toBeNull()
    expect(within(row).queryByRole('link')).toBeNull()
    expect(within(row).getByText('myComments.threadUnavailable')).toBeInTheDocument()
    expect(mockUseRiskComments).not.toHaveBeenCalled()
  })

  it('shows the empty state', () => {
    mockUseMyComments.mockReturnValue(page([]))
    renderPage()
    expect(screen.getByText('myComments.empty')).toBeInTheDocument()
  })
})
