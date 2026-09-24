import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { ImageDetail } from '../types'

export const imageKeys = {
  detail: (id: string, ignoreThresholds: boolean) => ['images', 'detail', id, ignoreThresholds] as const,
}

interface ImageDetailOptions {
  /** Drop the global CVSS/EPSS floor for this view (see ScopeParams.ignoreThresholds). */
  ignoreThresholds?: boolean
}

export function useImageDetail(imageId: string, options: ImageDetailOptions = {}) {
  const ignoreThresholds = options.ignoreThresholds ?? false
  const query = ignoreThresholds ? '?ignore_thresholds=true' : ''
  return useQuery({
    queryKey: imageKeys.detail(imageId, ignoreThresholds),
    queryFn: () => api.get<ImageDetail>(`/images/${encodeURIComponent(imageId)}${query}`),
    enabled: !!imageId,
  })
}
