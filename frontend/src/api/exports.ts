import type { ScopeParams } from '../hooks/useScope'

const BASE = '/api'

interface ExportFilters {
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
}

function buildExportQuery(filters: ExportFilters, scope: ScopeParams): string {
  const q = new URLSearchParams()
  Object.entries({ ...filters, ...scope }).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail || detail
    } catch { /* ignore */ }
    throw new Error(detail)
  }
  return res.blob()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportPdf(filters: ExportFilters, scope: ScopeParams) {
  const query = buildExportQuery(filters, scope)
  const blob = await fetchBlob(`${BASE}/exports/pdf${query}`)
  const today = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `cve-bericht-${today}.pdf`)
}

export async function exportExcel(filters: ExportFilters, scope: ScopeParams) {
  const query = buildExportQuery(filters, scope)
  const blob = await fetchBlob(`${BASE}/exports/excel${query}`)
  const today = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `cve-export-${today}.xlsx`)
}

export interface ImportPreviewItem {
  cve_id: string
  justification: string
  scope: string
  expires_at: string | null
  valid: boolean
  errors: string[]
  row_count: number
}

export interface ImportPreviewResult {
  items: ImportPreviewItem[]
  total_valid: number
  total_invalid: number
}

export interface ImportConfirmResult {
  created: { cve_id: string; ra_id: string }[]
  failed: { cve_id: string; error: string }[]
}

export async function importExcel(
  file: File,
  confirm: boolean,
): Promise<ImportPreviewResult | ImportConfirmResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE}/exports/excel/import?confirm=${confirm}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail || detail
    } catch { /* ignore */ }
    throw new Error(detail)
  }

  return res.json()
}
