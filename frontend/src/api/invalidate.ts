import type { QueryClient } from '@tanstack/react-query'

/**
 * Refresh every view that derives from CVE workflow state: CVE list, detail,
 * by-image and fix roll-up queries (all under the 'cves' prefix) and the dashboard.
 * Call after mutations on priorities, risk acceptances, remediations and
 * suppression rules, which change what those views show.
 */
export function invalidateCveViews(qc: QueryClient): Promise<void[]> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['cves'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}
