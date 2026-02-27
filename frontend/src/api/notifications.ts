import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AppNotification } from '../types'

export const notifKeys = {
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
}

export function useNotifications() {
  return useQuery({
    queryKey: notifKeys.list,
    queryFn: () => api.get<AppNotification[]>('/notifications'),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.list })
      qc.invalidateQueries({ queryKey: notifKeys.unread })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.list })
      qc.invalidateQueries({ queryKey: notifKeys.unread })
    },
  })
}
