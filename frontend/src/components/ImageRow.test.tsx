import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ImageRow } from './ImageRow'
import { Severity } from '../types'
import type { ImageCveDetail, ImageCveGroup } from '../types'

const mockUseCvesForImage = vi.fn()
vi.mock('../api/cves', () => ({
  useCvesForImage: (...args: unknown[]) => mockUseCvesForImage(...args),
}))

vi.mock('../hooks/useScope', () => ({
  useScopedLink: () => (to: string) => to,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

function makeGroup(overrides: Partial<ImageCveGroup> = {}): ImageCveGroup {
  return {
    image_name: 'quay.io/app:1.2',
    image_id: 'sha256:abc',
    total_cves: 42,
    critical_cves: 3,
    high_cves: 0,
    medium_cves: 20,
    low_cves: 9,
    max_cvss: 9.7,
    max_epss: 0.5,
    fixable_cves: 30,
    affected_deployments: 4,
    namespaces: ['payments'],
    clusters: ['cluster-a'],
    ...overrides,
  }
}

const CVE: ImageCveDetail = {
  cve_id: 'CVE-2024-0001',
  severity: Severity.CRITICAL,
  cvss: 9.8,
  epss_probability: 0.9,
  impact_score: 5.9,
  fixable: true,
  fixed_by: '1.2.3',
  affected_deployments: 2,
  first_seen: '2024-01-01T00:00:00Z',
  published_on: '2024-01-01T00:00:00Z',
  fix_available_since: null,
}

function renderRow(group: ImageCveGroup) {
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <ImageRow group={group} scope={{}} filters={{}} />
        </tbody>
      </table>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCvesForImage.mockReturnValue({ data: [CVE], isLoading: false })
})

describe('ImageRow', () => {
  it('renders exactly 8 cells in the outer row', () => {
    renderRow(makeGroup())
    const outerRow = screen.getAllByRole('row')[0]
    expect(within(outerRow).getAllByRole('cell')).toHaveLength(8)
  })

  it('shows severity counts in Critical / High / Medium / Low order with zeros as a dash', () => {
    renderRow(makeGroup())
    expect(screen.getByTestId('image-severity-counts').textContent).toBe('3 / – / 20 / 9')
  })

  it('does not render the max CVSS value', () => {
    renderRow(makeGroup())
    expect(screen.queryByText('9.7')).toBeNull()
  })

  it('spans the expanded content across all 8 columns', () => {
    renderRow(makeGroup())
    const outerRow = screen.getAllByRole('row')[0]
    fireEvent.click(within(outerRow).getByRole('button'))

    expect(screen.getByText('CVE-2024-0001')).toBeInTheDocument()
    const expandedCell = screen.getByText('cves.imageGroupFixHint').closest('td')
    expect(expandedCell).not.toBeNull()
    expect(expandedCell!.getAttribute('colspan')).toBe('8')
  })
})
