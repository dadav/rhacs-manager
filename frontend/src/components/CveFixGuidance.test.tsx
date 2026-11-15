import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CveFixGuidance } from './CveFixGuidance'
import type { ComponentPlacement } from '../types'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => `${key} ${values?.file ?? values?.count ?? ''}` }) }))
const placement: ComponentPlacement = {
  image_id: 'image-1', image_name: 'registry/flow:1', component_name: 'org.yaml:snakeyaml',
  component_version: '1.16', source: 'java', location: 'camunda/javaagent/jmx_prometheus_javaagent.jar',
  embedded_in: 'jmx_prometheus_javaagent.jar', fixed_by: '2.0', fixable: true, cves_at_location: 8,
}

describe('CveFixGuidance', () => {
  it('shows the containing artifact, related CVEs and a scoped image link', () => {
    render(<MemoryRouter initialEntries={['/?cluster=eu&ns=team&ignore_thresholds=1']}><CveFixGuidance placements={[placement]} components={[]} /></MemoryRouter>)
    expect(screen.getByText('fixGuidance.embedded jmx_prometheus_javaagent.jar')).toBeInTheDocument()
    expect(screen.getByText('fixGuidance.cvesInFile 8')).toBeInTheDocument()
    expect(screen.getByTitle(placement.location!)).toHaveTextContent(placement.location!)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/images/image-1?cluster=eu&ns=team&ignore_thresholds=1')
  })

  it('does not show embedded guidance or a file count for an ordinary package', () => {
    render(<MemoryRouter><CveFixGuidance placements={[{ ...placement, embedded_in: null, cves_at_location: null }]} components={[]} /></MemoryRouter>)
    expect(screen.queryByText(/fixGuidance.embedded/)).not.toBeInTheDocument()
    expect(screen.queryByText(/fixGuidance.cvesInFile/)).not.toBeInTheDocument()
  })

  it('falls back to the existing component data', () => {
    render(<MemoryRouter><CveFixGuidance placements={[]} components={[{ component_name: 'openssl', component_version: '3', fixed_by: '4', fixable: true }]} /></MemoryRouter>)
    expect(screen.getByText('openssl')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
