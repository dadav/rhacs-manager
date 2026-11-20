import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export function useSetCveAliases(cveId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliases: string[]) => api.put<{ cve_id: string; aliases: string[] }>(
      `/cves/${encodeURIComponent(cveId)}/aliases`, { aliases },
    ),
    onSuccess: () => Promise.all([
      'cves', 'dashboard', 'images', 'priorities', 'escalations', 'risk-acceptances',
      'remediations', 'suppression-rules', 'my-comments', 'audit-log', 'audit-log-filters',
    ].map(key => qc.invalidateQueries({ queryKey: [key] }))),
  })
}
