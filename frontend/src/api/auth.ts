import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { User } from '../types'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => api.get<User>('/auth/me'),
    staleTime: 5 * 60 * 1000,
  })
}

export function completeOnboarding() {
  return api.patch<{ ok: boolean }>('/auth/onboarding')
}
