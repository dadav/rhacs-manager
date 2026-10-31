import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EpssMatrixTooltip } from '../components/charts/EpssRiskMatrix'
import { Severity } from '../types'
import type { EpssMatrixPoint } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

function point(fixable: boolean): EpssMatrixPoint {
  return { cve_id: 'CVE-2024-0001', cvss: 9.8, epss: 0.95, severity: Severity.CRITICAL, fixable }
}

describe('EpssMatrixTooltip', () => {
  it('shows fixable for a fixable CVE', () => {
    render(<EpssMatrixTooltip active payload={[{ payload: point(true) }]} />)
    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
    expect(screen.getByText('dashboard.fixable')).toBeInTheDocument()
    expect(screen.queryByText('dashboard.unfixable')).not.toBeInTheDocument()
  })

  it('shows not fixable for an unfixable CVE', () => {
    render(<EpssMatrixTooltip active payload={[{ payload: point(false) }]} />)
    expect(screen.getByText('dashboard.unfixable')).toBeInTheDocument()
    expect(screen.queryByText('dashboard.fixable')).not.toBeInTheDocument()
  })

  it('renders nothing when inactive', () => {
    const { container } = render(<EpssMatrixTooltip active={false} payload={[{ payload: point(true) }]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
