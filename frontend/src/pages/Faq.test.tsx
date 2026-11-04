import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { Faq } from './Faq'
import de from '../faq/faq.de.json'
import en from '../faq/faq.en.json'

// --- Mocks ---

let mockLanguage = 'en'
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.count !== undefined ? `${key}:${opts.count}` : key),
    i18n: { language: mockLanguage },
  }),
}))

// Identity debounce: the URL write happens in the same act() as the input change.
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
}))

// --- Helpers ---

const BADGE_QUESTION = 'What are SVG badges for?'
const ESCALATION_QUESTION = 'How do escalations work?'

function Harness() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <span data-testid="key">{location.key}</span>
      <button type="button" onClick={() => navigate('/faq?q=escalate&cluster=c2')}>
        external-nav
      </button>
      <Faq />
    </>
  )
}

function renderFaq(url = '/faq', strict = false) {
  const tree = (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/faq" element={<Harness />} />
      </Routes>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

function searchBox(): HTMLInputElement {
  return screen.getByLabelText('faq.searchAriaLabel') as HTMLInputElement
}

function currentParams(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('search').textContent ?? '')
}

// --- Tests ---

describe('Faq', () => {
  beforeEach(() => {
    mockLanguage = 'en'
  })

  it('renders every category with collapsed entries', () => {
    renderFaq()
    for (const category of en.categories) {
      expect(screen.getByRole('heading', { level: 2, name: category.title })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: BADGE_QUESTION })).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles an entry open and closed without a query', () => {
    renderFaq()
    const toggle = screen.getByRole('button', { name: BADGE_QUESTION })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('filters, expands and highlights matching entries', () => {
    const { container } = renderFaq()
    fireEvent.change(searchBox(), { target: { value: 'readme' } })

    const toggle = screen.getByRole('button', { name: BADGE_QUESTION })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: ESCALATION_QUESTION })).not.toBeInTheDocument()
    expect(screen.getByText(/ready-made Markdown snippet/)).toBeVisible()
    const marks = Array.from(container.querySelectorAll('mark')).map((mark) => mark.textContent)
    expect(marks).toEqual(['README'])
    expect(screen.getByText('faq.resultsCount:1')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows an empty state and clears the search', () => {
    renderFaq()
    fireEvent.change(searchBox(), { target: { value: 'zzzqqq' } })
    expect(screen.getByRole('heading', { name: 'faq.noResults' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('faq.clearSearch'))
    expect(searchBox().value).toBe('')
    expect(screen.getByRole('button', { name: ESCALATION_QUESTION })).toBeInTheDocument()
    expect(currentParams().has('q')).toBe(false)
  })

  it('reads the initial query from the URL and keeps scope params when writing', () => {
    renderFaq('/faq?q=readme&cluster=c1&ns=payments&ignore_thresholds=1')
    expect(searchBox().value).toBe('readme')
    expect(screen.queryByRole('button', { name: ESCALATION_QUESTION })).not.toBeInTheDocument()

    fireEvent.change(searchBox(), { target: { value: 'escalate' } })
    const params = currentParams()
    expect(params.get('q')).toBe('escalate')
    expect(params.get('cluster')).toBe('c1')
    expect(params.get('ns')).toBe('payments')
    expect(params.get('ignore_thresholds')).toBe('1')
  })

  it('does not rewrite the URL on mount under StrictMode', () => {
    renderFaq('/faq?q=readme&cluster=c1', true)
    expect(screen.getByTestId('key').textContent).toBe('default')
    expect(currentParams().get('q')).toBe('readme')
  })

  it('follows external changes of the q param', () => {
    renderFaq('/faq?q=readme&cluster=c1')
    fireEvent.click(screen.getByText('external-nav'))
    expect(searchBox().value).toBe('escalate')
    expect(screen.getByRole('button', { name: ESCALATION_QUESTION })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: BADGE_QUESTION })).not.toBeInTheDocument()
    expect(currentParams().get('cluster')).toBe('c2')
  })

  it('renders the German content for a German UI', () => {
    mockLanguage = 'de'
    renderFaq()
    expect(screen.getByRole('heading', { level: 2, name: de.categories[0].title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: de.categories[0].entries[0].question })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.categories[0].entries[0].question })).not.toBeInTheDocument()
  })
})
