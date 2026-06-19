import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { fetchBlob, downloadBlob } from './exports'
import i18n from '../i18n'
import type { Paginated, AuditEntry } from '../types'

export interface AuditFilters {
  search?: string
  action?: string
  entity_type?: string
  date_from?: string
  date_to?: string
}

// Build a querystring, skipping empty values (mirrors exports.buildExportQuery).
function buildAuditQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function useAuditLog(page = 1, filters: AuditFilters = {}, pageSize = 50) {
  return useQuery({
    queryKey: ['audit-log', page, pageSize, filters],
    queryFn: () =>
      api.get<Paginated<AuditEntry>>(
        `/audit-log${buildAuditQuery({ page, page_size: pageSize, ...filters })}`,
      ),
    placeholderData: keepPreviousData,
  })
}

export interface AuditFilterOptions {
  actions: string[]
  entity_types: string[]
}

export function useAuditFilters() {
  return useQuery({
    queryKey: ['audit-log-filters'],
    queryFn: () => api.get<AuditFilterOptions>('/audit-log/filters'),
  })
}

export async function exportAuditExcel(filters: AuditFilters) {
  const query = buildAuditQuery({ ...filters, lang: i18n.language })
  const blob = await fetchBlob(`/api/audit-log/export${query}`)
  const today = new Date().toISOString().slice(0, 10)
  const prefix = i18n.language === 'en' ? 'audit-log' : 'audit-protokoll'
  downloadBlob(blob, `${prefix}-${today}.xlsx`)
}
