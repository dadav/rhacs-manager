import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { BadgeToken } from '../types'

export const badgeKeys = {
  list: ['badges', 'list'] as const,
}

export function useBadges() {
  return useQuery({
    queryKey: badgeKeys.list,
    queryFn: () => api.get<BadgeToken[]>('/badges'),
  })
}

export function useCreateBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { namespace?: string | null; cluster_name?: string | null; label?: string }) =>
      api.post<BadgeToken>('/badges', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgeKeys.list }),
  })
}

export function useDeleteBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/badges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: badgeKeys.list }),
  })
}
