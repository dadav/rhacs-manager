import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { MyCommentKind, MyCommentThread, Paginated } from '../types'

export interface MyCommentsParams {
  kind?: MyCommentKind
  only_with_replies?: boolean
  page?: number
  page_size?: number
}

export const myCommentKeys = {
  all: ['my-comments'] as const,
  list: (params: MyCommentsParams) => ['my-comments', 'list', params] as const,
}

// Every comment mutation must call this: the global 30s staleTime would
// otherwise serve an outdated thread list (reply badges, counts, snippets).
export function invalidateMyComments(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: myCommentKeys.all })
}

export function useMyComments(params: MyCommentsParams) {
  const q = new URLSearchParams()
  if (params.kind) q.set('kind', params.kind)
  if (params.only_with_replies) q.set('only_with_replies', 'true')
  if (params.page) q.set('page', String(params.page))
  if (params.page_size) q.set('page_size', String(params.page_size))
  const qs = q.toString()
  return useQuery({
    queryKey: myCommentKeys.list(params),
    queryFn: () => api.get<Paginated<MyCommentThread>>(`/comments/mine${qs ? `?${qs}` : ''}`),
    placeholderData: keepPreviousData,
  })
}
