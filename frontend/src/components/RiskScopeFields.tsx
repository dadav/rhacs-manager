import { Alert } from '@patternfly/react-core'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AffectedDeployment, RiskScope, RiskScopeMode } from '../types'

// Shared scope picker for creating and editing risk acceptances.
// Target keys: namespace = "cluster::namespace", image = "cluster::namespace::image",
// deployment = deployment_id.

const SCOPE_MODES: RiskScopeMode[] = ['all', 'namespace', 'image', 'deployment']

interface NamespaceOption {
  cluster_name: string
  namespace: string
}

interface ImageOption extends NamespaceOption {
  image_name: string
}

function namespaceKey(ns: NamespaceOption): string {
  return `${ns.cluster_name}::${ns.namespace}`
}

function imageKey(img: ImageOption): string {
  return `${img.cluster_name}::${img.namespace}::${img.image_name}`
}

export function uniqueNamespaces(deployments: AffectedDeployment[]): NamespaceOption[] {
  const byKey = new Map<string, NamespaceOption>()
  for (const d of deployments) {
    const ns = { cluster_name: d.cluster_name, namespace: d.namespace }
    byKey.set(namespaceKey(ns), ns)
  }
  return [...byKey.values()].sort((a, b) =>
    `${a.cluster_name}/${a.namespace}`.localeCompare(`${b.cluster_name}/${b.namespace}`),
  )
}

function uniqueImages(deployments: AffectedDeployment[]): ImageOption[] {
  const byKey = new Map<string, ImageOption>()
  for (const d of deployments) {
    const img = { cluster_name: d.cluster_name, namespace: d.namespace, image_name: d.image_name }
    byKey.set(imageKey(img), img)
  }
  return [...byKey.values()].sort((a, b) =>
    `${a.cluster_name}/${a.namespace}/${a.image_name}`.localeCompare(`${b.cluster_name}/${b.namespace}/${b.image_name}`),
  )
}

/**
 * Initial selection for a new risk acceptance. When the CVE affects exactly one
 * namespace, preselect it so the request qualifies for auto-approval.
 */
export function defaultScopeSelection(deployments: AffectedDeployment[]): { mode: RiskScopeMode; targets: string[] } {
  const namespaces = uniqueNamespaces(deployments)
  if (namespaces.length === 1) {
    return { mode: 'namespace', targets: [namespaceKey(namespaces[0])] }
  }
  return { mode: 'all', targets: [] }
}

/** Convert a saved scope back into selection keys for the form. */
export function scopeToSelection(scope: RiskScope): string[] {
  if (scope.mode === 'namespace') {
    return scope.targets.map((t) => namespaceKey(t))
  }
  if (scope.mode === 'image') {
    return scope.targets.map((t) => imageKey({ ...t, image_name: t.image_name ?? '' }))
  }
  if (scope.mode === 'deployment') {
    return scope.targets.map((t) => t.deployment_id ?? '').filter(Boolean)
  }
  return []
}

export function buildRiskScope(
  mode: RiskScopeMode,
  selectedTargets: string[],
  deployments: AffectedDeployment[],
): RiskScope {
  if (mode === 'all') {
    return { mode: 'all', targets: [] }
  }
  if (mode === 'namespace') {
    const targets = uniqueNamespaces(deployments).filter((ns) => selectedTargets.includes(namespaceKey(ns)))
    return { mode: 'namespace', targets }
  }
  if (mode === 'image') {
    const targets = uniqueImages(deployments).filter((img) => selectedTargets.includes(imageKey(img)))
    return { mode: 'image', targets }
  }
  const targets = deployments
    .filter((dep) => selectedTargets.includes(dep.deployment_id))
    .map((dep) => ({
      cluster_name: dep.cluster_name,
      namespace: dep.namespace,
      image_name: dep.image_name,
      deployment_id: dep.deployment_id,
    }))
  return { mode: 'deployment', targets }
}

/**
 * Mirrors backend `is_single_team_scope` (services/risk_acceptance_service.py):
 * exactly one (cluster, namespace) pair is auto-approved, anything else needs sec-team review.
 */
export function isAutoApprovedScope(scope: RiskScope): boolean {
  if (scope.mode === 'all') return false
  const distinct = new Set(scope.targets.map((t) => `${t.cluster_name}::${t.namespace}`))
  return distinct.size === 1
}

interface RiskScopeFieldsProps {
  deployments: AffectedDeployment[]
  mode: RiskScopeMode
  selectedTargets: string[]
  onModeChange: (mode: RiskScopeMode) => void
  onSelectedTargetsChange: (targets: string[]) => void
}

export function RiskScopeFields({
  deployments,
  mode,
  selectedTargets,
  onModeChange,
  onSelectedTargetsChange,
}: RiskScopeFieldsProps) {
  const { t } = useTranslation()
  const namespaces = useMemo(() => uniqueNamespaces(deployments), [deployments])
  const images = useMemo(() => uniqueImages(deployments), [deployments])

  const modeLabels: Record<RiskScopeMode, string> = {
    all: t('riskAcceptance.scopeAll'),
    namespace: t('riskAcceptance.scopeNamespace'),
    image: t('riskAcceptance.scopeImage'),
    deployment: t('riskAcceptance.scopeDeployment'),
  }

  const scope = buildRiskScope(mode, selectedTargets, deployments)
  const hasTargets = mode === 'all' || scope.targets.length > 0
  const autoApproved = isAutoApprovedScope(scope)

  function toggleTarget(key: string) {
    onSelectedTargetsChange(
      selectedTargets.includes(key) ? selectedTargets.filter((item) => item !== key) : [...selectedTargets, key],
    )
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>{t('riskAcceptance.scope')} *</label>
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          {SCOPE_MODES.map((m) => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                name="scope-mode"
                checked={mode === m}
                onChange={() => {
                  onModeChange(m)
                  onSelectedTargetsChange([])
                }}
              />
              <span style={{ fontSize: 13 }}>{modeLabels[m]}</span>
            </label>
          ))}
        </div>
      </div>
      {mode !== 'all' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>{t('riskAcceptance.scopeTargets')}</label>
          <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', border: '1px solid #d2d2d2', borderRadius: 4, padding: 10 }}>
            {mode === 'namespace' && namespaces.map((ns) => {
              const key = namespaceKey(ns)
              return (
                <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                  <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                  <span style={{ marginLeft: 8, fontSize: 12 }}>{ns.cluster_name}/{ns.namespace}</span>
                </label>
              )
            })}
            {mode === 'image' && images.map((img) => {
              const key = imageKey(img)
              return (
                <label key={key} style={{ display: 'block', marginBottom: 6 }}>
                  <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                  <span style={{ marginLeft: 8, fontSize: 12 }}>{img.cluster_name}/{img.namespace} - {img.image_name}</span>
                </label>
              )
            })}
            {mode === 'deployment' && deployments.map((dep) => (
              <label key={dep.deployment_id} style={{ display: 'block', marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={selectedTargets.includes(dep.deployment_id)}
                  onChange={() => toggleTarget(dep.deployment_id)}
                />
                <span style={{ marginLeft: 8, fontSize: 12 }}>{dep.cluster_name}/{dep.namespace} - {dep.deployment_name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {hasTargets && (
        <Alert
          data-testid="risk-scope-approval"
          variant={autoApproved ? 'success' : 'info'}
          isInline
          isPlain
          title={autoApproved ? t('riskAcceptance.scopeAutoApproved') : t('riskAcceptance.scopeNeedsReview')}
          style={{ marginBottom: 16 }}
        >
          {!autoApproved && namespaces.length > 1 && t('riskAcceptance.scopeNeedsReviewHint')}
        </Alert>
      )}
    </>
  )
}
