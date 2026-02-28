import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export function useNamespaces() {
  return useQuery({
    queryKey: ['namespaces'],
    queryFn: () => api.get<{ namespace: string; cluster_name: string }[]>('/namespaces'),
  })
}
