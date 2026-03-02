import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface ScopeParams {
  cluster?: string
  namespace?: string
}

export function useScope() {
  const [searchParams, setSearchParams] = useSearchParams()

  const cluster = searchParams.get('cluster') || undefined
  const namespace = searchParams.get('ns') || undefined

  const scopeParams: ScopeParams = useMemo(
    () => ({ cluster, namespace }),
    [cluster, namespace],
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

  const scopeSearchString = useMemo(() => {
    const q = new URLSearchParams()
    if (cluster) q.set('cluster', cluster)
    if (namespace) q.set('ns', namespace)
    return q.toString()
  }, [cluster, namespace])

  return { cluster, namespace, scopeParams, setScope, scopeSearchString }
}

/** Build a link target that preserves scope params. */
export function buildScopedTo(to: string, scopeSearchString: string): string {
  if (!scopeSearchString) return to
  const separator = to.includes('?') ? '&' : '?'
  return `${to}${separator}${scopeSearchString}`
}
