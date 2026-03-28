import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { User } from '../types'

export interface UserSearchResult {
  id: string
  username: string
}

export const authKeys = {
  me: ['auth', 'me'] as const,
  userSearch: (q: string, role?: string) => ['auth', 'users', 'search', q, role] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.get<User>('/auth/me'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserSearch(query: string, enabled: boolean, role?: string) {
  const params = new URLSearchParams({ q: query })
  if (role) params.set('role', role)
  return useQuery({
    queryKey: authKeys.userSearch(query, role),
    queryFn: () => api.get<UserSearchResult[]>(`/auth/users/search?${params}`),
    enabled,
    staleTime: 30_000,
  })
}

export function completeOnboarding() {
  return api.patch<{ ok: boolean }>('/auth/onboarding')
}
