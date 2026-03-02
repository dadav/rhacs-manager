import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { TeamDashboardData, SecDashboardData } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const dashboardKeys = {
  team: (scope: ScopeParams = {}) => ['dashboard', 'team', scope] as const,
  sec: ['dashboard', 'sec'] as const,
}

function scopeQuery(scope: ScopeParams): string {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useTeamDashboard(scope: ScopeParams = {}) {
  return useQuery({
    queryKey: dashboardKeys.team(scope),
    queryFn: () => api.get<TeamDashboardData>(`/dashboard${scopeQuery(scope)}`),
    refetchInterval: 5 * 60 * 1000,
  })
}

export function useSecDashboard() {
  return useQuery({
    queryKey: dashboardKeys.sec,
    queryFn: () => api.get<SecDashboardData>('/dashboard/sec'),
    refetchInterval: 5 * 60 * 1000,
  })
}
