import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  computePhases,
  CveWorkflowStepper,
  getCurrentPhase,
  MEMBER_PHASES,
  SEC_TEAM_PHASES,
  type Phase,
  type WorkflowCve,
  type WorkflowRemediation,
} from './CveWorkflowStepper'
import { RemediationStatus, RiskStatus } from '../types'
import type { AffectedDeployment } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      key === 'cveDetail.workflowStepAria' ? `${opts?.step}: ${opts?.status}` : key,
    i18n: { language: 'en' },
  }),
}))

// --- Helpers ---

function row(overrides: Partial<AffectedDeployment> = {}): AffectedDeployment {
  return {
    deployment_id: 'dep-1',
    deployment_name: 'api',
    namespace: 'payments',
    cluster_name: 'cluster-a',
    image_name: 'quay.io/acme/api:1',
    image_id: 'sha256:aaa',
    first_seen: null,
    risk_acceptance_status: null,
    remediation_status: null,
    is_suppressed: false,
    ...overrides,
  }
}

const APPROVED = { risk_acceptance_status: RiskStatus.approved }
const REQUESTED = { risk_acceptance_status: RiskStatus.requested }

function makeCve(overrides: Partial<WorkflowCve> = {}): WorkflowCve {
  return {
    has_priority: false,
    has_risk_acceptance: false,
    risk_acceptance_status: null,
    no_longer_affected: false,
    affected_deployments_list: [row()],
    ...overrides,
  }
}

function withRows(rows: AffectedDeployment[], overrides: Partial<WorkflowCve> = {}): WorkflowCve {
  return makeCve({ affected_deployments_list: rows, ...overrides })
}

function rems(...statuses: RemediationStatus[]): WorkflowRemediation[] {
  return statuses.map((status) => ({ status }))
}

// --- Nonempty affected deployment list: per-row coverage ---

describe('computePhases with affected deployments', () => {
  it('does not resolve when an approved risk acceptance covers only some deployments (regression)', () => {
    // CVE-level status says approved, but the second deployment has no coverage.
    const cve = withRows(
      [row(APPROVED), row({ deployment_id: 'dep-2', namespace: 'billing' })],
      { has_risk_acceptance: true, risk_acceptance_status: RiskStatus.approved },
    )
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'partial_coverage' })
    expect(phases.resolve.state).toBe('todo')
    expect(getCurrentPhase(phases, MEMBER_PHASES)).toBe('remediate')
  })

  it.each([
    { name: 'member', order: MEMBER_PHASES },
    { name: 'sec team', order: SEC_TEAM_PHASES },
  ])('keeps partial acceptance unresolved for the $name phase set', ({ order }) => {
    const cve = withRows([row(APPROVED), row({ deployment_id: 'dep-2' })], {
      has_priority: true,
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    const phases = computePhases(cve, [], order)
    expect(phases.remediate.state).toBe('in_progress')
    expect(phases.resolve.state).toBe('todo')
    expect(getCurrentPhase(phases, order)).toBe('remediate')
  })

  it('resolves when the union of approved acceptances covers every deployment', () => {
    // Two different acceptances, each covering one namespace; the backend unions them per row.
    const cve = withRows(
      [row(APPROVED), row({ ...APPROVED, deployment_id: 'dep-2', namespace: 'billing' })],
      { has_risk_acceptance: true, risk_acceptance_status: RiskStatus.approved },
    )
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'done' })
    expect(phases.resolve.state).toBe('done')
  })

  it.each([
    { remediation: RemediationStatus.resolved },
    { remediation: RemediationStatus.verified },
    { remediation: RemediationStatus.wont_fix },
  ])('resolves on mixed coverage: approved acceptance plus $remediation remediation', ({ remediation }) => {
    const cve = withRows([
      row(APPROVED),
      row({ deployment_id: 'dep-2', namespace: 'billing', remediation_status: remediation }),
    ])
    const phases = computePhases(cve, rems(remediation), MEMBER_PHASES)
    expect(phases.remediate.state).toBe('done')
    expect(phases.resolve.state).toBe('done')
  })

  it('resolves when every deployment has a terminal remediation', () => {
    const cve = withRows([
      row({ remediation_status: RemediationStatus.resolved }),
      row({ deployment_id: 'dep-2', namespace: 'billing', remediation_status: RemediationStatus.wont_fix }),
    ])
    const phases = computePhases(cve, rems(RemediationStatus.resolved, RemediationStatus.wont_fix), MEMBER_PHASES)
    expect(phases.resolve.state).toBe('done')
  })

  it.each([
    { name: 'no remediation', uncovered: null },
    { name: 'an open remediation', uncovered: RemediationStatus.open },
  ])('shows partial coverage when a terminal remediation leaves a row with $name', ({ uncovered }) => {
    const cve = withRows([
      row({ remediation_status: RemediationStatus.resolved }),
      row({ deployment_id: 'dep-2', namespace: 'billing', remediation_status: uncovered }),
    ])
    const phases = computePhases(cve, rems(RemediationStatus.resolved), MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'partial_coverage' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('shows an in-progress remediation as in progress, never done', () => {
    const cve = withRows([row({ remediation_status: RemediationStatus.in_progress })])
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
    expect(phases.resolve.state).toBe('todo')
    expect(getCurrentPhase(phases, MEMBER_PHASES)).toBe('remediate')
  })

  it.each([
    { name: 'open', status: RemediationStatus.open },
    { name: 'unknown', status: 'archived_by_future_version' },
  ])('does not treat an $name remediation as active work', ({ status }) => {
    const cve = withRows([row({ remediation_status: status })])
    const phases = computePhases(cve, rems(RemediationStatus.open), MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'todo' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('shows a requested acceptance on an uncovered row as awaiting approval', () => {
    const cve = withRows([row(REQUESTED)], {
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.requested,
    })
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'awaiting_approval' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('prefers awaiting approval over partial coverage for an approved plus requested mixture', () => {
    const cve = withRows([row(APPROVED), row({ ...REQUESTED, deployment_id: 'dep-2', namespace: 'billing' })], {
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'awaiting_approval' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('prefers remediating over awaiting approval on uncovered rows', () => {
    const cve = withRows([
      row(REQUESTED),
      row({ deployment_id: 'dep-2', namespace: 'billing', remediation_status: RemediationStatus.in_progress }),
    ])
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
  })

  it('ignores activity on rows that are already covered', () => {
    // The in-progress remediation sits on a row an approved acceptance already covers.
    const cve = withRows([
      row({ ...APPROVED, remediation_status: RemediationStatus.in_progress }),
      row({ deployment_id: 'dep-2', namespace: 'billing' }),
    ])
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'partial_coverage' })
  })

  it.each([
    { name: 'rejected', status: RiskStatus.rejected },
    { name: 'expired', status: RiskStatus.expired },
    { name: 'missing', status: null },
    { name: 'unknown', status: 'pending_review_v2' },
  ])('does not progress remediate for a $name acceptance status on the only row', ({ status }) => {
    const cve = withRows([row({ risk_acceptance_status: status })])
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'todo' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('counts each image row of the same deployment separately', () => {
    const cve = withRows([
      row({ ...APPROVED, image_id: 'sha256:aaa' }),
      row({ image_id: 'sha256:bbb', image_name: 'quay.io/acme/sidecar:1' }),
    ])
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'partial_coverage' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('resolves when a deployment-mode acceptance covers every image row of that deployment', () => {
    const cve = withRows([
      row({ ...APPROVED, image_id: 'sha256:aaa' }),
      row({ ...APPROVED, image_id: 'sha256:bbb', image_name: 'quay.io/acme/sidecar:1' }),
    ])
    expect(computePhases(cve, [], MEMBER_PHASES).resolve.state).toBe('done')
  })

  it('ignores remediation records that do not belong to a visible deployment row', () => {
    // A resolved remediation elsewhere must not complete an uncovered row in scope.
    const uncovered = computePhases(makeCve(), rems(RemediationStatus.resolved), MEMBER_PHASES)
    expect(uncovered.assess.state).toBe('done')
    expect(uncovered.remediate).toEqual({ state: 'todo' })
    expect(uncovered.resolve.state).toBe('todo')

    // An in-progress remediation elsewhere must not reopen fully covered rows.
    const covered = computePhases(withRows([row(APPROVED)]), rems(RemediationStatus.in_progress), MEMBER_PHASES)
    expect(covered.resolve.state).toBe('done')
  })

  it('ignores the aggregate risk acceptance status for completion', () => {
    const cve = withRows([row()], { has_risk_acceptance: true, risk_acceptance_status: RiskStatus.approved })
    const phases = computePhases(cve, [], MEMBER_PHASES)
    expect(phases.assess.state).toBe('done')
    expect(phases.remediate).toEqual({ state: 'todo' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('judges only the deployments of the current visible scope', () => {
    const covered = row(APPROVED)
    const outsideScope = row({ deployment_id: 'dep-2', namespace: 'billing', cluster_name: 'cluster-b' })
    const narrowed = computePhases(withRows([covered]), [], MEMBER_PHASES)
    const wide = computePhases(withRows([covered, outsideScope]), [], MEMBER_PHASES)
    expect(narrowed.resolve.state).toBe('done')
    expect(wide.resolve.state).toBe('todo')
  })

  it('does not count suppression alone as coverage', () => {
    const suppressedOnly = computePhases(withRows([row({ is_suppressed: true })]), [], MEMBER_PHASES)
    expect(suppressedOnly.remediate).toEqual({ state: 'todo' })
    expect(suppressedOnly.resolve.state).toBe('todo')

    const mixed = computePhases(withRows([row(APPROVED), row({ deployment_id: 'dep-2', is_suppressed: true })]), [], MEMBER_PHASES)
    expect(mixed.resolve.state).toBe('todo')

    const suppressedAndAccepted = computePhases(withRows([row({ ...APPROVED, is_suppressed: true })]), [], MEMBER_PHASES)
    expect(suppressedAndAccepted.resolve.state).toBe('done')
  })

  it('keeps a single current phase for the sec team', () => {
    const cve = withRows([row({ remediation_status: RemediationStatus.in_progress })])
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), SEC_TEAM_PHASES)
    expect(phases.prioritize.state).toBe('todo')
    expect(phases.remediate.state).toBe('in_progress')
    expect(getCurrentPhase(phases, SEC_TEAM_PHASES)).toBe('prioritize')
  })

  it('shows in-progress remediation to a sec team user once prioritized', () => {
    const cve = withRows([row({ remediation_status: RemediationStatus.in_progress })], { has_priority: true })
    const phases = computePhases(cve, rems(RemediationStatus.in_progress), SEC_TEAM_PHASES)
    expect(getCurrentPhase(phases, SEC_TEAM_PHASES)).toBe('remediate')
    expect(phases.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
  })

  it.each([[undefined], [[]]])('leaves assess todo without remediations or acceptances (%j)', (remediations) => {
    const phases = computePhases(makeCve(), remediations, MEMBER_PHASES)
    expect(phases.assess.state).toBe('todo')
    expect(phases.remediate.state).toBe('todo')
    expect(getCurrentPhase(phases, MEMBER_PHASES)).toBe('assess')
  })
})

// --- Empty affected deployment list ---

describe('computePhases without affected deployments', () => {
  it.each([
    { name: 'resolved and wont_fix', statuses: [RemediationStatus.resolved, RemediationStatus.wont_fix] },
    { name: 'verified', statuses: [RemediationStatus.verified] },
  ])('resolves a no-longer-affected CVE whose remediations are all terminal ($name)', ({ statuses }) => {
    const cve = withRows([], { no_longer_affected: true })
    const phases = computePhases(cve, rems(...statuses), MEMBER_PHASES)
    expect(phases.remediate.state).toBe('done')
    expect(phases.resolve.state).toBe('done')
  })

  it('never resolves an empty list vacuously while the CVE still affects the scope', () => {
    const cve = withRows([], {
      no_longer_affected: false,
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    const phases = computePhases(cve, rems(RemediationStatus.resolved), MEMBER_PHASES)
    expect(phases.remediate.state).toBe('todo')
    expect(phases.resolve.state).toBe('todo')
  })

  it.each([[undefined], [[]]])('does not resolve a no-longer-affected CVE without loaded remediations (%j)', (remediations) => {
    const cve = withRows([], { no_longer_affected: true })
    const phases = computePhases(cve, remediations, MEMBER_PHASES)
    expect(phases.remediate).toEqual({ state: 'todo' })
    expect(phases.resolve.state).toBe('todo')
  })

  it('keeps a pending auto-resolve unresolved', () => {
    const open = computePhases(withRows([], { no_longer_affected: true }), rems(RemediationStatus.open), MEMBER_PHASES)
    expect(open.remediate).toEqual({ state: 'todo' })
    expect(open.resolve.state).toBe('todo')

    const partial = computePhases(
      withRows([], { no_longer_affected: true }),
      rems(RemediationStatus.resolved, RemediationStatus.in_progress),
      MEMBER_PHASES,
    )
    expect(partial.remediate).toEqual({ state: 'in_progress', activity: 'remediating' })
    expect(partial.resolve.state).toBe('todo')
  })

  it('does not let an approved aggregate acceptance resolve a no-longer-affected CVE', () => {
    const cve = withRows([], {
      no_longer_affected: true,
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    const phases = computePhases(cve, rems(RemediationStatus.open), MEMBER_PHASES)
    expect(phases.resolve.state).toBe('todo')
  })
})

// --- Rendering ---

function step(phase: Phase): HTMLElement {
  const element = document.getElementById(`workflow-${phase}`)
  if (!element) throw new Error(`step ${phase} not rendered`)
  return element
}

describe('CveWorkflowStepper', () => {
  it('renders partial coverage on the remediate step with an actionable hint', () => {
    const cve = withRows([row(APPROVED), row({ deployment_id: 'dep-2', namespace: 'billing' })], {
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    render(<CveWorkflowStepper cve={cve} remediations={[]} isSecTeam={false} />)

    const remediate = step('remediate')
    expect(remediate).toHaveAttribute('aria-current', 'step')
    expect(remediate).toHaveAttribute(
      'aria-label',
      'cveDetail.workflowRemediate: cveDetail.workflowStatePartialCoverage',
    )
    expect(remediate).toHaveTextContent('cveDetail.workflowPartialCoverage')
    expect(step('resolve')).toHaveAttribute('aria-label', 'cveDetail.workflowResolve: cveDetail.workflowStatePending')
    expect(screen.getByText('cveDetail.hintPartialCoverage')).toBeInTheDocument()
    expect(screen.queryByText('cveDetail.hintComplete')).not.toBeInTheDocument()
  })

  it('renders the complete hint once every deployment is covered', () => {
    const cve = withRows([row(APPROVED), row({ deployment_id: 'dep-2', remediation_status: RemediationStatus.resolved })], {
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    render(<CveWorkflowStepper cve={cve} remediations={rems(RemediationStatus.resolved)} isSecTeam={false} />)

    expect(step('resolve')).toHaveAttribute('aria-label', 'cveDetail.workflowResolve: cveDetail.workflowStateDone')
    expect(screen.getByText('cveDetail.hintComplete')).toBeInTheDocument()
  })

  it('hides the hint while remediations are still loading', () => {
    const cve = withRows([row(APPROVED), row({ deployment_id: 'dep-2' })], {
      has_risk_acceptance: true,
      risk_acceptance_status: RiskStatus.approved,
    })
    render(<CveWorkflowStepper cve={cve} remediations={undefined} isSecTeam={false} />)

    // Coverage is still computed from the detail annotations.
    expect(step('remediate')).toHaveTextContent('cveDetail.workflowPartialCoverage')
    expect(screen.queryByText('cveDetail.hintPartialCoverage')).not.toBeInTheDocument()
    expect(screen.queryByText('cveDetail.hintComplete')).not.toBeInTheDocument()
  })

  it('hides the hint while remediations load even when coverage is complete', () => {
    const cve = withRows([row(APPROVED)])
    render(<CveWorkflowStepper cve={cve} remediations={undefined} isSecTeam />)

    expect(step('resolve')).toHaveAttribute('aria-label', 'cveDetail.workflowResolve: cveDetail.workflowStateDone')
    expect(screen.queryByText('cveDetail.hintComplete')).not.toBeInTheDocument()
  })
})
