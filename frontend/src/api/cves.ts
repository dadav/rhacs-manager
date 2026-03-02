import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Paginated, CveListItem, CveDetail, AffectedDeployment, CveComment } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const cveKeys = {
  list: (params: Record<string, unknown>) => ['cves', 'list', params] as const,
  detail: (id: string) => ['cves', 'detail', id] as const,
  deployments: (id: string) => ['cves', 'deployments', id] as const,
  comments: (id: string) => ['cves', 'comments', id] as const,
}

interface CveListParams {
  page?: number
  page_size?: number
  search?: string
  severity?: number
  fixable?: boolean
  prioritized_only?: boolean
  sort_by?: string
  sort_desc?: boolean
  cvss_min?: number
  epss_min?: number
  component?: string
  risk_status?: string
  cluster?: string
  namespace?: string
}

function buildQuery(params: CveListParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) {
      v.forEach(item => q.append(k, String(item)))
    } else {
      q.set(k, String(v))
    }
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useCves(params: CveListParams = {}, scope: ScopeParams = {}) {
  const merged = { ...params, cluster: scope.cluster, namespace: scope.namespace }
  return useQuery({
    queryKey: cveKeys.list(merged as Record<string, unknown>),
    queryFn: () => api.get<Paginated<CveListItem>>(`/cves${buildQuery(merged)}`),
  })
}

export function useCveDetail(cveId: string) {
  return useQuery({
    queryKey: cveKeys.detail(cveId),
    queryFn: () => api.get<CveDetail>(`/cves/${encodeURIComponent(cveId)}`),
    enabled: !!cveId,
  })
}

export function useCveDeployments(cveId: string) {
  return useQuery({
    queryKey: cveKeys.deployments(cveId),
    queryFn: () => api.get<AffectedDeployment[]>(`/cves/${encodeURIComponent(cveId)}/deployments`),
    enabled: !!cveId,
  })
}

export function useCveComments(cveId: string) {
  return useQuery({
    queryKey: cveKeys.comments(cveId),
    queryFn: () => api.get<CveComment[]>(`/cves/${encodeURIComponent(cveId)}/comments`),
    enabled: !!cveId,
    refetchInterval: 30000,
  })
}

export function useAddCveComment(cveId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      api.post<CveComment>(`/cves/${encodeURIComponent(cveId)}/comments`, { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: cveKeys.comments(cveId) }),
  })
}
