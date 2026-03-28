import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { CvePriority, PriorityLevel } from '../types'

export const priorityKeys = {
  list: ['priorities', 'list'] as const,
  detail: (id: string) => ['priorities', 'detail', id] as const,
}

export function usePriorities() {
  return useQuery({
    queryKey: priorityKeys.list,
    queryFn: () => api.get<CvePriority[]>('/priorities'),
  })
}

export function usePriority(id: string) {
  return useQuery({
    queryKey: priorityKeys.detail(id),
    queryFn: () => api.get<CvePriority>(`/priorities/${id}`),
  })
}

export function useCreatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { cve_id: string; priority: PriorityLevel; reason: string; deadline?: string | null }) =>
      api.post<CvePriority>('/priorities', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: priorityKeys.list }),
  })
}

export function useUpdatePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { priority?: PriorityLevel; reason?: string; deadline?: string | null } }) =>
      api.patch<CvePriority>(`/priorities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: priorityKeys.list }),
  })
}

export function useDeletePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/priorities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: priorityKeys.list }),
  })
}
