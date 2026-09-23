import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

/** One notification category. `null` means the channel does not exist for it. */
export interface NotificationPreferenceItem {
  category: string
  in_app: boolean | null
  email: boolean | null
}

export interface NotificationPreferences {
  items: NotificationPreferenceItem[]
  team_notifications_active: boolean
}

const preferencesKey = ['me', 'notification-preferences'] as const

export function useNotificationPreferences() {
  return useQuery({
    queryKey: preferencesKey,
    queryFn: () => api.get<NotificationPreferences>('/me/notification-preferences'),
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: NotificationPreferenceItem[]) =>
      api.put<NotificationPreferences>('/me/notification-preferences', { items }),
    onSuccess: (data) => {
      qc.setQueryData(preferencesKey, data)
    },
  })
}
