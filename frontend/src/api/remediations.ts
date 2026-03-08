import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { RemediationItem, RemediationStats } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const remediationKeys = {
  list: (params: Record<string, unknown>) => ['remediations', 'list', params] as const,
  detail: (id: string) => ['remediations', 'detail', id] as const,
  stats: (params: Record<string, unknown>) => ['remediations', 'stats', params] as const,
  byCve: (cveId: string, scope: Record<string, unknown>) => ['remediations', 'byCve', cveId, scope] as const,
}

interface RemediationListParams {
  status?: string
  cve_id?: string
  assigned_to?: string
  overdue?: boolean
  cluster?: string
  namespace?: string
}

function buildQuery(params: RemediationListParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useRemediations(params: RemediationListParams = {}, scope: ScopeParams = {}) {
  const merged = { ...params, cluster: scope.cluster, namespace: scope.namespace }
  return useQuery({
    queryKey: remediationKeys.list(merged as Record<string, unknown>),
    queryFn: () => api.get<RemediationItem[]>(`/remediations${buildQuery(merged)}`),
  })
}

export function useRemediationsByCve(cveId: string, scope: ScopeParams = {}) {
  const params = { cve_id: cveId, cluster: scope.cluster, namespace: scope.namespace }
  return useQuery({
    queryKey: remediationKeys.byCve(cveId, params as Record<string, unknown>),
    queryFn: () => api.get<RemediationItem[]>(`/remediations${buildQuery(params)}`),
    enabled: !!cveId,
  })
}

export function useRemediationStats(scope: ScopeParams = {}) {
  const params = { cluster: scope.cluster, namespace: scope.namespace }
  return useQuery({
    queryKey: remediationKeys.stats(params as Record<string, unknown>),
    queryFn: () => {
      const q = new URLSearchParams()
      if (params.cluster) q.set('cluster', params.cluster)
      if (params.namespace) q.set('namespace', params.namespace)
      const s = q.toString()
      return api.get<RemediationStats>(`/remediations/stats${s ? `?${s}` : ''}`)
    },
  })
}

export function useCreateRemediation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      cve_id: string
      namespace: string
      cluster_name: string
      assigned_to?: string | null
      target_date?: string | null
      notes?: string | null
    }) => api.post<RemediationItem>('/remediations', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remediations'] })
    },
  })
}

export function useUpdateRemediation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      status?: string
      assigned_to?: string | null
      target_date?: string | null
      notes?: string | null
      wont_fix_reason?: string | null
    }) => api.patch<RemediationItem>(`/remediations/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remediations'] })
    },
  })
}

export function useDeleteRemediation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/remediations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remediations'] })
    },
  })
}
