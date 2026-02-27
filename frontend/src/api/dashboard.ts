import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { TeamDashboardData, SecDashboardData } from '../types'

export const dashboardKeys = {
  team: ['dashboard', 'team'] as const,
  sec: ['dashboard', 'sec'] as const,
}

export function useTeamDashboard() {
  return useQuery({
    queryKey: dashboardKeys.team,
    queryFn: () => api.get<TeamDashboardData>('/dashboard'),
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
