import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { SuppressionRules } from './SuppressionRules'

// --- Mocks ---

const mutation = { mutateAsync: vi.fn(), isPending: false }
vi.mock('../api/suppressionRules', () => ({
  useSuppressionRules: () => ({ data: [], isLoading: false, error: null }),
  useCreateSuppressionRule: () => mutation,
  useReviewSuppressionRule: () => mutation,
  useDeleteSuppressionRule: () => mutation,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'me' }, isSecTeam: false }),
}))

vi.mock('../hooks/useScope', () => ({
  useScopedLink: () => (to: string) => to,
}))

vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))

vi.mock('../components/TableSkeleton', () => ({
  TableSkeletonRows: () => null,
}))

// --- Tests ---

function openCveRuleForm() {
  render(
    <MemoryRouter>
      <SuppressionRules />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'suppressionRules.create' }))
  fireEvent.click(screen.getByRole('button', { name: 'suppressionRules.typeCve' }))
  fireEvent.change(screen.getByLabelText('suppressionRules.cveId'), { target: { value: 'CVE-2024-12345' } })
  const reason = document.querySelector('textarea')
  if (!reason) throw new Error('reason textarea not rendered')
  fireEvent.change(reason, { target: { value: 'Scanner misidentifies this component version.' } })
}

describe('SuppressionRules create form', () => {
  it('disables submit while namespace scope is selected, since targets are picked on the CVE detail page', () => {
    openCveRuleForm()
    const submit = screen.getByRole('button', { name: 'suppressionRules.submit' })
    expect(submit).toBeEnabled()

    fireEvent.click(screen.getByRole('radio', { name: 'suppressionRules.scopeNamespace' }))
    expect(submit).toBeDisabled()
    expect(screen.getByText('suppressionRules.scopeNamespaceHint')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'suppressionRules.scopeAll' }))
    expect(submit).toBeEnabled()
  })
})
