import { useState } from 'react'

export interface FilteredPagination {
  search: string
  page: number
  perPage: number
  totalCount: number
  filteredCount: number
  setSearch: (search: string) => void
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
}

export function useFilteredPagination<T>(
  items: T[],
  searchValues: (item: T) => (string | null | undefined)[],
): FilteredPagination & { pageItems: T[] } {
  const [state, setState] = useState({ search: '', page: 1, perPage: 20 })
  const query = state.search.trim().toLowerCase()
  const filtered = query
    ? items.filter(item => searchValues(item).some(value => value?.toLowerCase().includes(query)))
    : items
  const lastPage = Math.max(1, Math.ceil(filtered.length / state.perPage))
  const page = Math.max(1, Math.min(state.page, lastPage))

  // Persist the clamp so a later refetch cannot restore an obsolete page.
  if (page !== state.page) setState({ ...state, page })

  return {
    ...state,
    page,
    totalCount: items.length,
    filteredCount: filtered.length,
    pageItems: filtered.slice((page - 1) * state.perPage, page * state.perPage),
    setSearch: search => setState(current => ({ ...current, search, page: 1 })),
    setPage: nextPage => setState(current => ({ ...current, page: nextPage })),
    setPerPage: perPage => setState(current => ({ ...current, perPage, page: 1 })),
  }
}
