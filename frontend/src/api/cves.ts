import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Paginated, CveListItem, CveDetail, AffectedDeployment } from '../types'

export const cveKeys = {
  list: (params: Record<string, unknown>) => ['cves', 'list', params] as const,
  detail: (id: string) => ['cves', 'detail', id] as const,
  deployments: (id: string) => ['cves', 'deployments', id] as const,
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
}

function buildQuery(params: CveListParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      q.set(k, String(v))
    }
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useCves(params: CveListParams = {}) {
  return useQuery({
    queryKey: cveKeys.list(params as Record<string, unknown>),
    queryFn: () => api.get<Paginated<CveListItem>>(`/cves${buildQuery(params)}`),
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
