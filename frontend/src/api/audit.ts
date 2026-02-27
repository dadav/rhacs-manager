import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Paginated, AuditEntry } from '../types'

export function useAuditLog(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['audit-log', page, pageSize],
    queryFn: () => api.get<Paginated<AuditEntry>>(`/audit-log?page=${page}&page_size=${pageSize}`),
  })
}
