import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Team } from '../types'

export const teamKeys = {
  list: ['teams', 'list'] as const,
  detail: (id: string) => ['teams', 'detail', id] as const,
}

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list,
    queryFn: () => api.get<Team[]>('/teams'),
  })
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => api.get<Team>(`/teams/${id}`),
    enabled: !!id,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; email: string; namespaces: { namespace: string; cluster_name: string }[] }) =>
      api.post<Team>('/teams', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.list }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; email: string; namespaces: { namespace: string; cluster_name: string }[] }> }) =>
      api.patch<Team>(`/teams/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.list }),
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.list }),
  })
}
