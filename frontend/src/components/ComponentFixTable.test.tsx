import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ComponentFixTable } from './ComponentFixTable'
import { Severity } from '../types'
import type { FixRollupItem } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.versions ? `${key}:${opts.versions}` : key),
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

function makeItem(overrides: Partial<FixRollupItem> = {}): FixRollupItem {
  return {
    component_name: 'openssl',
    component_version: '3.0.7',
    operating_system: 'rhel:9',
    target_version: '1.0',
    fix_versions: ['1.0', '%%%'],
    target_uncertain: true,
    total_cves: 1,
    fixable_cves: 1,
    prioritized_cves: 0,
    critical_cves: 0,
    max_severity: Severity.IMPORTANT,
    max_cvss: 7.5,
    max_epss: 0.1,
    affected_images: 1,
    affected_deployments: 1,
    namespaces: [],
    images: [],
    cves: [
      {
        cve_id: 'CVE-2024-0001',
        severity: Severity.IMPORTANT,
        cvss: 7.5,
        epss_probability: 0.1,
        fixable: true,
        fixed_by: '1.0',
        fix_candidates: ['1.0', '%%%'],
        has_priority: false,
      },
    ],
    ...overrides,
  }
}

describe('ComponentFixTable', () => {
  it('marks an uncertain target and lists every fix candidate when expanded', () => {
    const { container } = render(<MemoryRouter><ComponentFixTable items={[makeItem()]} /></MemoryRouter>)

    expect(screen.getByText(/1\.0 \?/)).toBeInTheDocument()

    const expandToggle = container.querySelector('button[aria-expanded]')
    expect(expandToggle).not.toBeNull()
    fireEvent.click(expandToggle as HTMLButtonElement)

    expect(screen.getByText('cves.componentUncertainHint:1.0, %%%')).toBeInTheDocument()
    expect(screen.getByText('1.0, %%%')).toBeInTheDocument()
  })

  it('shows a plain target when all candidates are comparable', () => {
    render(
      <MemoryRouter>
        <ComponentFixTable items={[makeItem({ target_uncertain: false, fix_versions: ['1.0'] })]} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/\?/)).not.toBeInTheDocument()
  })
})
