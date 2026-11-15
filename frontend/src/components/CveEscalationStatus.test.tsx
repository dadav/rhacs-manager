import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CveEscalationStatus } from './CveEscalationStatus'
import type { EscalationLocation } from '../types'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }))
const location: EscalationLocation = {
  cluster_name: 'eu', namespace: 'team', level: 1, triggered_at: '2026-01-01T12:00:00Z',
  next_level: 2, next_level_at: '2026-01-08T12:00:00Z', stopped_reason: null,
}

describe('CveEscalationStatus', () => {
  it('shows each location and its current and next level', () => {
    render(<CveEscalationStatus locations={[location]} />)
    expect(screen.getByText('eu/team')).toBeInTheDocument()
    expect(screen.getByText('escalations.level1')).toBeInTheDocument()
    expect(screen.getByText('escalations.level2')).toBeInTheDocument()
    expect(screen.getByText('escalationStatus.explainer')).toBeInTheDocument()
    expect(screen.getByText(/1\/8\/2026/)).toBeInTheDocument()
  })

  it.each(['risk_accepted', 'suppressed'] as const)('shows %s instead of a deadline', stopped_reason => {
    render(<CveEscalationStatus locations={[{ ...location, stopped_reason, next_level_at: null }]} />)
    expect(screen.getByText(`escalationStatus.${stopped_reason}`)).toBeInTheDocument()
    expect(screen.queryByText('escalations.level2')).not.toBeInTheDocument()
  })

  it('shows a non-escalated location without a configured deadline', () => {
    render(<CveEscalationStatus locations={[{ ...location, level: 0, triggered_at: null, next_level: null, next_level_at: null }]} />)
    expect(screen.getByText('escalationStatus.notTriggered')).toBeInTheDocument()
    expect(screen.getByText('escalationStatus.noNext')).toBeInTheDocument()
  })
})
