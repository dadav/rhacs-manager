import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { SuppressionRule, SuppressionScope, SuppressionType } from '../types'

export const suppressionKeys = {
  list: (status?: string, type?: string) => ['suppression-rules', 'list', status, type] as const,
  detail: (id: string) => ['suppression-rules', 'detail', id] as const,
}

export function useSuppressionRules(status?: string, type?: string) {
  const q = new URLSearchParams()
  if (status) q.set('status', status)
  if (type) q.set('type', type)
  const qs = q.toString()
  return useQuery({
    queryKey: suppressionKeys.list(status, type),
    queryFn: () => api.get<SuppressionRule[]>(`/suppression-rules${qs ? `?${qs}` : ''}`),
  })
}

export function useSuppressionRule(id: string) {
  return useQuery({
    queryKey: suppressionKeys.detail(id),
    queryFn: () => api.get<SuppressionRule>(`/suppression-rules/${id}`),
    enabled: !!id,
  })
}

export function useCreateSuppressionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      type: SuppressionType
      component_name?: string | null
      version_pattern?: string | null
      cve_id?: string | null
      reason: string
      reference_url?: string | null
      scope?: SuppressionScope | null
    }) => api.post<SuppressionRule>('/suppression-rules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppression-rules'] })
      qc.invalidateQueries({ queryKey: ['cves'] })
    },
  })
}

export function useReviewSuppressionRule(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { approved: boolean; comment?: string }) =>
      api.patch<SuppressionRule>(`/suppression-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppression-rules'] })
      qc.invalidateQueries({ queryKey: ['cves'] })
    },
  })
}

export function useUpdateSuppressionRule(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      reason: string
      reference_url?: string | null
      scope?: SuppressionScope | null
    }) => api.put<SuppressionRule>(`/suppression-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppression-rules'] })
    },
  })
}

export function useDeleteSuppressionRule(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/suppression-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppression-rules'] })
      qc.invalidateQueries({ queryKey: ['cves'] })
    },
  })
}
