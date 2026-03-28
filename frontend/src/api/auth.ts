import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { User } from '../types'

export interface UserSearchResult {
  id: string
  username: string
}

export const authKeys = {
  me: ['auth', 'me'] as const,
  userSearch: (q: string) => ['auth', 'users', 'search', q] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.get<User>('/auth/me'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUserSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: authKeys.userSearch(query),
    queryFn: () => api.get<UserSearchResult[]>(`/auth/users/search?q=${encodeURIComponent(query)}`),
    enabled,
    staleTime: 30_000,
  })
}

export function completeOnboarding() {
  return api.patch<{ ok: boolean }>('/auth/onboarding')
}
