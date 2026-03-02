import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { BadgeToken } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const badgeKeys = {
  list: (scope: ScopeParams = {}) => ['badges', 'list', scope] as const,
}

export function useBadges(scope: ScopeParams = {}) {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const qs = q.toString()
  return useQuery({
    queryKey: badgeKeys.list(scope),
    queryFn: () => api.get<BadgeToken[]>(`/badges${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { namespace?: string | null; cluster_name?: string | null; label?: string }) =>
      api.post<BadgeToken>('/badges', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badges'] }),
  })
}

export function useDeleteBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/badges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badges'] }),
  })
}
