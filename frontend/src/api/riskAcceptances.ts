import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { RiskAcceptance, RiskComment, RiskScope } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const raKeys = {
  list: (status?: string, scope: ScopeParams = {}) => ['risk-acceptances', 'list', status, scope] as const,
  detail: (id: string) => ['risk-acceptances', 'detail', id] as const,
  comments: (id: string) => ['risk-acceptances', 'comments', id] as const,
}

export function useRiskAcceptances(status?: string, scope: ScopeParams = {}) {
  const q = new URLSearchParams()
  if (status) q.set('status', status)
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const qs = q.toString()
  return useQuery({
    queryKey: raKeys.list(status, scope),
    queryFn: () => api.get<RiskAcceptance[]>(`/risk-acceptances${qs ? `?${qs}` : ''}`),
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
      scope: RiskScope
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

export function useUpdateRiskAcceptance(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      justification: string
      scope: RiskScope
      expires_at?: string | null
    }) => api.put<RiskAcceptance>(`/risk-acceptances/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risk-acceptances'] })
      qc.invalidateQueries({ queryKey: ['cves'] })
    },
  })
}

export function useCancelRiskAcceptance(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/risk-acceptances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risk-acceptances'] })
      qc.invalidateQueries({ queryKey: ['cves'] })
    },
  })
}

export function useAssignReviewer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<RiskAcceptance>(`/risk-acceptances/${id}/assign`, { user_id: userId }),
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
