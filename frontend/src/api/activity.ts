import { api } from './client'

// Mirrors backend/app/schemas/activity.py (GET /api/activity).

export interface ActivityImageRef {
  image_id_v2: string | null
  image_digest: string | null
  image_name: string | null
}

export interface DeploymentActivityDetails {
  deployment_id: string
  deployment_name: string | null
}

export interface DeploymentImagesActivityDetails extends DeploymentActivityDetails {
  added_images: ActivityImageRef[]
  removed_images: ActivityImageRef[]
}

export interface ImageScanActivityDetails {
  image_id_v2: string
  image_digest: string | null
  image_name: string | null
  component_count: number | null
  cve_count: number | null
  fixable_cve_count: number | null
}

interface ActivityEventBase {
  /** Decimal string; event ids can exceed Number.MAX_SAFE_INTEGER. */
  id: string
  observed_at: string
  /** ACS scan time for scan events; null for inventory observations. */
  source_at: string | null
  cluster_name: string
  namespace: string
}

export type ActivityEvent =
  | (ActivityEventBase & { kind: 'deployment_observed'; details: DeploymentActivityDetails })
  | (ActivityEventBase & { kind: 'deployment_removed'; details: DeploymentActivityDetails })
  | (ActivityEventBase & { kind: 'deployment_images_changed'; details: DeploymentImagesActivityDetails })
  | (ActivityEventBase & { kind: 'image_scanned'; details: ImageScanActivityDetails })
  | (ActivityEventBase & { kind: 'image_scan_updated'; details: ImageScanActivityDetails })

export type ActivityEventKind = ActivityEvent['kind']

export type CollectorStatus = 'waiting' | 'live' | 'stale'

export interface ActivityFeedPage {
  items: ActivityEvent[]
  next_cursor: string
  has_more: boolean
  reset: boolean
  scope_key: string
  last_success_at: string | null
  collector_status: CollectorStatus
}

export interface ActivityFeedRequest {
  cluster?: string
  namespace?: string
  cursor?: string | null
  limit: number
}

export const activityKeys = {
  all: ['activity'] as const,
  /** One bounded cache entry per feed generation; cursors are never part of the key. */
  feed: (userId: string, cluster: string | undefined, namespace: string | undefined, generation: number) =>
    ['activity', 'feed', userId, cluster ?? null, namespace ?? null, generation] as const,
}

export function fetchActivityPage(request: ActivityFeedRequest, signal?: AbortSignal): Promise<ActivityFeedPage> {
  const params = new URLSearchParams({ limit: String(request.limit) })
  if (request.cluster) params.set('cluster', request.cluster)
  if (request.namespace) params.set('namespace', request.namespace)
  if (request.cursor) params.set('cursor', request.cursor)
  return api.get<ActivityFeedPage>(`/activity?${params}`, { signal })
}
