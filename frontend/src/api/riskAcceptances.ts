import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { RiskAcceptance, RiskComment } from '../types'

export const raKeys = {
  list: (status?: string) => ['risk-acceptances', 'list', status] as const,
  detail: (id: string) => ['risk-acceptances', 'detail', id] as const,
  comments: (id: string) => ['risk-acceptances', 'comments', id] as const,
}

export function useRiskAcceptances(status?: string) {
  return useQuery({
    queryKey: raKeys.list(status),
    queryFn: () => api.get<RiskAcceptance[]>(`/risk-acceptances${status ? `?status=${status}` : ''}`),
  })
}

export function useRiskAcceptance(id: string) {
  return useQuery({
    queryKey: raKeys.detail(id),
    queryFn: () => api.get<RiskAcceptance>(`/risk-acceptances/${id}`),
    enabled: !!id,
  })
}

export function useRiskComments(id: string) {
  return useQuery({
    queryKey: raKeys.comments(id),
    queryFn: () => api.get<RiskComment[]>(`/risk-acceptances/${id}/comments`),
    enabled: !!id,
    refetchInterval: 30000,
  })
}

export function useCreateRiskAcceptance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      cve_id: string
      justification: string
      scope: { images?: string[]; namespaces?: string[] }
      expires_at?: string | null
    }) => api.post<RiskAcceptance>('/risk-acceptances', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risk-acceptances'] }),
  })
}

export function useReviewRiskAcceptance(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { approved: boolean; comment?: string }) =>
      api.patch<RiskAcceptance>(`/risk-acceptances/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risk-acceptances'] })
    },
  })
}

export function useAddComment(raId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      api.post<RiskComment>(`/risk-acceptances/${raId}/comments`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: raKeys.comments(raId) })
      qc.invalidateQueries({ queryKey: raKeys.detail(raId) })
    },
  })
}
