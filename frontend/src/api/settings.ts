import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { GlobalSettings, ThresholdInfo, ThresholdPreview } from '../types'

export const settingsKeys = {
  settings: ['settings'] as const,
  thresholds: ['settings', 'thresholds'] as const,
  preview: (cvss: number, epss: number) => ['settings', 'preview', cvss, epss] as const,
}

export function useThresholds() {
  return useQuery({
    queryKey: settingsKeys.thresholds,
    queryFn: () => api.get<ThresholdInfo>('/settings/thresholds'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.settings,
    queryFn: () => api.get<GlobalSettings>('/settings'),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<GlobalSettings, 'id' | 'updated_by' | 'updated_at'>) =>
      api.patch<GlobalSettings>('/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.settings }),
  })
}

export function useSendDigest() {
  return useMutation({
    mutationFn: () => api.post<{ status: string }>('/settings/send-digest'),
  })
}

export function useThresholdPreview(minCvss: number, minEpss: number) {
  return useQuery({
    queryKey: settingsKeys.preview(minCvss, minEpss),
    queryFn: () =>
      api.get<ThresholdPreview>(`/settings/threshold-preview?min_cvss=${minCvss}&min_epss=${minEpss}`),
  })
}
