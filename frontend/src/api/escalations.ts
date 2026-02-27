import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Escalation } from '../types'

export function useEscalations() {
  return useQuery({
    queryKey: ['escalations'],
    queryFn: () => api.get<Escalation[]>('/escalations'),
  })
}
