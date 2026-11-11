import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { ImageDetail } from '../types'
import type { ScopeParams } from '../hooks/useScope'

export const imageKeys = {
  detail: (id: string, scope: ScopeParams) => ['images', 'detail', id, scope] as const,
}

/**
 * Image detail for the sidebar scope: cluster/namespace narrow the visible
 * deployments (never widen them) and ignoreThresholds drops the CVSS/EPSS floor.
 */
export function useImageDetail(imageId: string, scope: ScopeParams = {}) {
  const q = new URLSearchParams()
  if (scope.cluster) q.set('cluster', scope.cluster)
  if (scope.namespace) q.set('namespace', scope.namespace)
  if (scope.ignoreThresholds) q.set('ignore_thresholds', 'true')
  const query = q.toString() ? `?${q.toString()}` : ''
  return useQuery({
    queryKey: imageKeys.detail(imageId, scope),
    queryFn: () => api.get<ImageDetail>(`/images/${encodeURIComponent(imageId)}${query}`),
    enabled: !!imageId,
  })
}
