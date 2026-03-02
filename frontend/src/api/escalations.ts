import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Escalation, UpcomingEscalation } from '../types'
import type { ScopeParams } from '../hooks/useScope'

function buildQs(scope: ScopeParams): string {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useEscalations(scope: ScopeParams = {}) {
  return useQuery({
    queryKey: ['escalations', scope],
    queryFn: () => api.get<Escalation[]>(`/escalations${buildQs(scope)}`),
  })
}

export function useUpcomingEscalations(scope: ScopeParams = {}) {
  return useQuery({
    queryKey: ['escalations', 'upcoming', scope],
    queryFn: () => api.get<UpcomingEscalation[]>(`/escalations/upcoming${buildQs(scope)}`),
  })
}
