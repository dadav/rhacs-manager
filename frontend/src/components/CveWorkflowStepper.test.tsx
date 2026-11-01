import { describe, it, expect } from 'vitest'
import {
  computePhases,
  getCurrentPhase,
  MEMBER_PHASES,
  SEC_TEAM_PHASES,
  type WorkflowCve,
  type WorkflowRemediation,
} from './CveWorkflowStepper'
import { RemediationStatus, RiskStatus } from '../types'

function makeCve(overrides: Partial<WorkflowCve> = {}): WorkflowCve {
  return {
    has_priority: false,
    has_risk_acceptance: false,
    risk_acceptance_status: null,
    ...overrides,
  }
}

function rems(...statuses: RemediationStatus[]): WorkflowRemediation[] {
  return statuses.map((status) => ({ status }))
}

describe('computePhases', () => {
  it('shows an in-progress remediation as in progress, never done', () => {
    const phases = computePhases(makeCve(), rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
    expect(phases.resolve.state).toBe('todo')
    expect(getCurrentPhase(phases, MEMBER_PHASES)).toBe('remediate')
  })

  it('treats an open remediation as assessed but not started', () => {
    const phases = computePhases(makeCve(), rems(RemediationStatus.open), MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate.state).toBe('todo')
  })

  it('treats partial completion as in progress', () => {
    const phases = computePhases(
      makeCve(),
      rems(RemediationStatus.resolved, RemediationStatus.open),
      MEMBER_PHASES,
    )
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
    expect(phases.resolve.state).toBe('todo')
  })

  it.each([
    [[RemediationStatus.resolved, RemediationStatus.wont_fix]],
    [[RemediationStatus.verified]],
  ])('completes remediate and resolve when all remediations are terminal (%j)', (statuses) => {
    const phases = computePhases(makeCve(), rems(...statuses), MEMBER_PHASES)
    expect(phases.remediate.state).toBe('done')
    expect(phases.resolve.state).toBe('done')
  })

  it('shows a requested risk acceptance as awaiting approval', () => {
    const cve = makeCve({ has_risk_acceptance: true, risk_acceptance_status: RiskStatus.requested })
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'awaiting_approval' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('prefers remediating over awaiting approval when both apply', () => {
    const cve = makeCve({ has_risk_acceptance: true, risk_acceptance_status: RiskStatus.requested })
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
  })

  it('completes remediate and resolve on an approved risk acceptance', () => {
    const cve = makeCve({ has_risk_acceptance: true, risk_acceptance_status: RiskStatus.approved })
    const phases = computePhases(cve, rems(RemediationStatus.open), MEMBER_PHASES)
    expect(phases.remediate.state).toBe('done')
    expect(phases.resolve.state).toBe('done')
  })

  it.each([RiskStatus.rejected, RiskStatus.expired])(
    'does not progress remediate on a %s risk acceptance',
    (status) => {
      const cve = makeCve({ has_risk_acceptance: true, risk_acceptance_status: status })
      const phases = computePhases(cve, [], MEMBER_PHASES)
      expect(phases.remediate.state).toBe('todo')
      expect(phases.resolve.state).toBe('todo')
    },
  )

  it.each([[undefined], [[]]])('leaves remediate todo without remediations (%j)', (remediations) => {
    const phases = computePhases(makeCve(), remediations, MEMBER_PHASES)
    expect(phases.assess.state).toBe('todo')
    expect(phases.remediate.state).toBe('todo')
    expect(getCurrentPhase(phases, MEMBER_PHASES)).toBe('assess')
  })

  it('keeps a single current phase for the sec team', () => {
    const phases = computePhases(makeCve(), rems(RemediationStatus.in_progress), SEC_TEAM_PHASES)
    expect(phases.prioritize.state).toBe('todo')
    expect(phases.remediate.state).toBe('in_progress')
    expect(getCurrentPhase(phases, SEC_TEAM_PHASES)).toBe('prioritize')
  })

  it('shows in-progress remediation to a sec team user once prioritized', () => {
    const phases = computePhases(
      makeCve({ has_priority: true }),
      rems(RemediationStatus.in_progress),
      SEC_TEAM_PHASES,
    )
    expect(getCurrentPhase(phases, SEC_TEAM_PHASES)).toBe('remediate')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
  })
})
