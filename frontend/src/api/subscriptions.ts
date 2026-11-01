import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

/** Whether the signed-in user follows a CVE ("Abonnieren"). */
export interface CveSubscriptionState {
  cve_id: string
  subscribed: boolean
}

export const subscriptionKeys = {
  cve: (cveId: string) => ['cves', 'subscription', cveId] as const,
}

export function useCveSubscription(cveId: string) {
  return useQuery({
    queryKey: subscriptionKeys.cve(cveId),
    queryFn: () => api.get<CveSubscriptionState>(`/cves/${encodeURIComponent(cveId)}/subscription`),
    enabled: !!cveId,
  })
}

export function useSetCveSubscription(cveId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (subscribed: boolean) => {
      const path = `/cves/${encodeURIComponent(cveId)}/subscription`
      return subscribed ? api.put<CveSubscriptionState>(path) : api.delete<CveSubscriptionState>(path)
    },
    onSuccess: (data) => {
      qc.setQueryData(subscriptionKeys.cve(cveId), data)
      // List rows carry is_subscribed and the "Nur abonnierte" filter depends on it.
      qc.invalidateQueries({ queryKey: ['cves', 'list'] })
      qc.invalidateQueries({ queryKey: ['cves', 'fixes'] })
    },
  })
}
