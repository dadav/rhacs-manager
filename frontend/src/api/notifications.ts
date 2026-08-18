import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AppNotification } from '../types'

export const notifKeys = {
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
}

function invalidateNotificationQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: notifKeys.list }),
    queryClient.invalidateQueries({ queryKey: notifKeys.unread }),
  ])
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
    onSuccess: () => invalidateNotificationQueries(qc),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => invalidateNotificationQueries(qc),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: (_data, id) => {
      const list = qc.getQueryData<AppNotification[]>(notifKeys.list)
      const removed = list?.find(n => n.id === id)
      if (list) {
        qc.setQueryData<AppNotification[]>(notifKeys.list, list.filter(n => n.id !== id))
      }
      // Only unread notifications count toward the badge.
      if (removed && !removed.read) {
        qc.setQueryData<{ count: number }>(notifKeys.unread, prev =>
          prev ? { count: Math.max(0, prev.count - 1) } : prev,
        )
      }
      return invalidateNotificationQueries(qc)
    },
  })
}

export function useClearNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/notifications'),
    onSuccess: () => {
      qc.setQueryData<AppNotification[]>(notifKeys.list, [])
      qc.setQueryData<{ count: number }>(notifKeys.unread, { count: 0 })
      return invalidateNotificationQueries(qc)
    },
  })
}
