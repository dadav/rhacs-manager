import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export interface ScopeParams {
  cluster?: string
  namespace?: string
  /**
   * Per-user view opt-out of the global CVSS/EPSS thresholds. View-only: it never
   * widens namespace visibility, and background alerts keep the global thresholds.
   */
  ignoreThresholds?: boolean
}

/** URL search param that carries the threshold opt-out alongside cluster/ns. */
export const IGNORE_THRESHOLDS_PARAM = 'ignore_thresholds'

/** Backend query params for a scope (snake_case, undefined values omitted by callers). */
export function scopeApiParams(scope: ScopeParams): {
  cluster?: string
  namespace?: string
  ignore_thresholds?: boolean
} {
  return {
    cluster: scope.cluster,
    namespace: scope.namespace,
    ignore_thresholds: scope.ignoreThresholds ? true : undefined,
  }
}

export function useScope() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cluster = searchParams.get('cluster') || undefined
  const namespace = searchParams.get('ns') || undefined
  const ignoreThresholds = searchParams.get(IGNORE_THRESHOLDS_PARAM) === '1'

  const scopeParams: ScopeParams = useMemo(
    () => ({ cluster, namespace, ignoreThresholds: ignoreThresholds || undefined }),
    [cluster, namespace, ignoreThresholds],
  )

  const setScope = useCallback(
    (newCluster?: string, newNamespace?: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (newCluster) {
          next.set('cluster', newCluster)
        } else {
          next.delete('cluster')
        }
        if (newNamespace) {
          next.set('ns', newNamespace)
        } else {
          next.delete('ns')
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setIgnoreThresholds = useCallback(
    (on: boolean) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (on) {
          next.set(IGNORE_THRESHOLDS_PARAM, '1')
        } else {
          next.delete(IGNORE_THRESHOLDS_PARAM)
        }
        // Result set changes, so any list page offset is stale.
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const scopeSearchString = useMemo(() => {
    const q = new URLSearchParams()
    if (cluster) q.set('cluster', cluster)
    if (namespace) q.set('ns', namespace)
    if (ignoreThresholds) q.set(IGNORE_THRESHOLDS_PARAM, '1')
    return q.toString()
  }, [cluster, namespace, ignoreThresholds])

  return {
    cluster,
    namespace,
    ignoreThresholds,
    scopeParams,
    setScope,
    setIgnoreThresholds,
    scopeSearchString,
  }
}

/**
 * Build a link target that preserves scope params (cluster, ns, ignore_thresholds).
 * Params already present in `to` win, so drilldowns like `?cluster=x` override the
 * sidebar scope instead of producing duplicate keys.
 */
export function buildScopedTo(to: string, scopeSearchString: string): string {
  if (!scopeSearchString) return to
  const queryStart = to.indexOf('?')
  const path = queryStart === -1 ? to : to.slice(0, queryStart)
  const merged = new URLSearchParams(queryStart === -1 ? '' : to.slice(queryStart + 1))
  new URLSearchParams(scopeSearchString).forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value)
  })
  const query = merged.toString()
  return query ? `${path}?${query}` : path
}

/**
 * `(to) => scoped link` for in-app navigation. Every internal link into a CVE,
 * image, or list view must go through this so the sidebar scope and the
 * "Show all CVEs" opt-out survive navigation.
 */
export function useScopedLink(): (to: string) => string {
  const { scopeSearchString } = useScope()
  return useCallback((to: string) => buildScopedTo(to, scopeSearchString), [scopeSearchString])
}
