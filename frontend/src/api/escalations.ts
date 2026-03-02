import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Escalation } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export function useEscalations(scope: ScopeParams = {}) {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const qs = q.toString()
  return useQuery({
    queryKey: ['escalations', scope],
    queryFn: () => api.get<Escalation[]>(`/escalations${qs ? `?${qs}` : ''}`),
  })
}
