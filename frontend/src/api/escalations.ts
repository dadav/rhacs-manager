import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  ActiveSearchResponse,
  CommentInput,
  CveComment,
  Escalation,
  UpcomingEscalation,
  UpcomingSearchResponse,
} from '../types'
import type { ScopeParams } from '../hooks/useScope'

function buildQs(scope: ScopeParams): string {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useEscalations(scope: ScopeParams = {}) {
  return useQuery({
    queryKey: ['escalations', scope],
    queryFn: () => api.get<Escalation[]>(`/escalations${buildQs(scope)}`),
    placeholderData: keepPreviousData,
  })
}

export function useUpcomingEscalations(scope: ScopeParams = {}) {
  return useQuery({
    queryKey: ['escalations', 'upcoming', scope],
    queryFn: () => api.get<UpcomingEscalation[]>(`/escalations/upcoming${buildQs(scope)}`),
    placeholderData: keepPreviousData,
  })
}

// --- Server-side paginated/filtered workspace queries ---

export interface ActiveSearchParams {
  page: number
  page_size: number
  search?: string
  level?: string
  email_status?: string
  contact_status?: string
  cluster?: string
  namespace?: string
}

export interface UpcomingSearchParams {
  page: number
  page_size: number
  search?: string
  next_level?: string
  severity?: string
  days_max?: string
  cluster?: string
  namespace?: string
}

function buildSearchQs(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== '' && val !== null) q.set(key, String(val))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useActiveEscalationSearch(params: ActiveSearchParams) {
  return useQuery({
    queryKey: ['escalations', 'active-search', params],
    queryFn: () =>
      api.get<ActiveSearchResponse>(`/escalations/active/search${buildSearchQs({ ...params })}`),
    placeholderData: keepPreviousData,
  })
}

export function useUpcomingEscalationSearch(params: UpcomingSearchParams) {
  return useQuery({
    queryKey: ['escalations', 'upcoming-search', params],
    queryFn: () =>
      api.get<UpcomingSearchResponse>(`/escalations/upcoming/search${buildSearchQs({ ...params })}`),
    placeholderData: keepPreviousData,
  })
}

export function useAddEscalationComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ escalationId, payload }: { escalationId: string; payload: CommentInput }) =>
      api.post<CveComment>(`/escalations/${escalationId}/comments`, payload),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['escalations'] }),
        qc.invalidateQueries({ queryKey: ['cves', 'comments'] }),
      ])
    },
  })
}
