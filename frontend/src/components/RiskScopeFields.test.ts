import { describe, it, expect } from 'vitest'
import { buildRiskScope, defaultScopeSelection, isAutoApprovedScope, scopeToSelection } from './RiskScopeFields'
import type { AffectedDeployment } from '../types'

function dep(id: string, namespace: string, image = 'img:1', cluster = 'c1'): AffectedDeployment {
  return {
    deployment_id: id,
    deployment_name: `deploy-${id}`,
    namespace,
    cluster_name: cluster,
    image_name: image,
    image_id: `sha-${image}`,
    first_seen: null,
  }
}

describe('defaultScopeSelection', () => {
  it('preselects the namespace when the CVE affects exactly one', () => {
    const selection = defaultScopeSelection([dep('a', 'payments'), dep('b', 'payments', 'img:2')])
    expect(selection).toEqual({ mode: 'namespace', targets: ['c1::payments'] })
  })

  it('falls back to all when several namespaces are affected', () => {
    const selection = defaultScopeSelection([dep('a', 'payments'), dep('b', 'billing')])
    expect(selection).toEqual({ mode: 'all', targets: [] })
  })

  it('treats the same namespace on different clusters as different namespaces', () => {
    const selection = defaultScopeSelection([dep('a', 'payments', 'img:1', 'c1'), dep('b', 'payments', 'img:1', 'c2')])
    expect(selection.mode).toBe('all')
  })
})

describe('isAutoApprovedScope', () => {
  const deployments = [dep('a', 'payments'), dep('b', 'payments', 'img:2'), dep('c', 'billing')]

  it('is false for mode all', () => {
    expect(isAutoApprovedScope(buildRiskScope('all', [], deployments))).toBe(false)
  })

  it('is true for several images in one namespace', () => {
    const scope = buildRiskScope('image', ['c1::payments::img:1', 'c1::payments::img:2'], deployments)
    expect(isAutoApprovedScope(scope)).toBe(true)
  })

  it('is false for deployments spanning two namespaces', () => {
    const scope = buildRiskScope('deployment', ['a', 'c'], deployments)
    expect(isAutoApprovedScope(scope)).toBe(false)
  })
})

describe('scopeToSelection', () => {
  it('round-trips a namespace scope', () => {
    const deployments = [dep('a', 'payments'), dep('c', 'billing')]
    const scope = buildRiskScope('namespace', ['c1::billing'], deployments)
    expect(scopeToSelection(scope)).toEqual(['c1::billing'])
  })
})
