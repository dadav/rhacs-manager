import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThresholdNotice } from './ThresholdNotice'

let mockThresholds: { min_cvss_score: number; min_epss_score: number } | undefined
let mockIsSecTeam = false
let mockIgnoreThresholds = false
const mockSetIgnoreThresholds = vi.fn()

vi.mock('../../api/settings', () => ({
  useThresholds: () => ({ data: mockThresholds }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isSecTeam: mockIsSecTeam }),
}))

vi.mock('../../hooks/useScope', () => ({
  useScope: () => ({ ignoreThresholds: mockIgnoreThresholds, setIgnoreThresholds: mockSetIgnoreThresholds }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockThresholds = { min_cvss_score: 7, min_epss_score: 0.1 }
  mockIsSecTeam = false
  mockIgnoreThresholds = false
})

describe('ThresholdNotice', () => {
  it('offers to show all CVEs while thresholds apply', () => {
    render(<ThresholdNotice />)

    expect(screen.getByText('cves.thresholdHint')).toBeInTheDocument()
    fireEvent.click(screen.getByText('scope.showAllCves'))
    expect(mockSetIgnoreThresholds).toHaveBeenCalledWith(true)
  })

  it('offers to reapply thresholds when the user opted out', () => {
    mockIgnoreThresholds = true
    render(<ThresholdNotice />)

    expect(screen.getByText('scope.thresholdsIgnoredNotice')).toBeInTheDocument()
    fireEvent.click(screen.getByText('scope.reapplyThresholds'))
    expect(mockSetIgnoreThresholds).toHaveBeenCalledWith(false)
  })

  it('renders nothing for the sec team', () => {
    mockIsSecTeam = true
    const { container } = render(<ThresholdNotice />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no thresholds are configured', () => {
    mockThresholds = { min_cvss_score: 0, min_epss_score: 0 }
    const { container } = render(<ThresholdNotice />)
    expect(container).toBeEmptyDOMElement()
  })
})
