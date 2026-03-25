import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { ImageDetail } from '../types'

export const imageKeys = {
  detail: (id: string) => ['images', 'detail', id] as const,
}

export function useImageDetail(imageId: string) {
  return useQuery({
    queryKey: imageKeys.detail(imageId),
    queryFn: () => api.get<ImageDetail>(`/images/${encodeURIComponent(imageId)}`),
    enabled: !!imageId,
  })
}
