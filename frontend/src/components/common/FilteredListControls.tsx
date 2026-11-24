import { Button, Pagination, SearchInput } from '@patternfly/react-core'
import { Td, Tr } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import type { FilteredPagination } from '../../hooks/useFilteredPagination'
import './FilteredListControls.css'

interface Props {
  list: FilteredPagination
  id: string
  label: string
}

export function FilteredListPagination({ list, id, label, position = 'top' }: Props & { position?: 'top' | 'bottom' }) {
  const { t } = useTranslation()
  if (position === 'bottom' && list.filteredCount <= list.perPage) return null

  return (
    <Pagination
      className="pf-m-display-full"
      widgetId={`${id}-${position}`}
      variant={position}
      isCompact
      isStatic
      itemCount={list.filteredCount}
      page={list.page}
      perPage={list.perPage}
      perPageOptions={[10, 20, 50, 100].map(value => ({ title: String(value), value }))}
      onSetPage={(_, page) => list.setPage(page)}
      onPerPageSelect={(_, perPage) => list.setPerPage(perPage)}
      titles={{
        paginationAriaLabel: t(`listControls.pagination.${position}`, { list: label }),
        currPageAriaLabel: t('listControls.pagination.currentPage'),
        optionsToggleAriaLabel: t('listControls.pagination.options', { list: label }),
        items: t('listControls.pagination.items'),
        itemsPerPage: t('listControls.pagination.itemsPerPage'),
        ofWord: t('listControls.pagination.of'),
        page: t('listControls.pagination.page'),
        pages: t('listControls.pagination.pages'),
        perPageSuffix: t('listControls.pagination.perPage'),
        toFirstPageAriaLabel: t('listControls.pagination.first'),
        toLastPageAriaLabel: t('listControls.pagination.last'),
        toNextPageAriaLabel: t('listControls.pagination.next'),
        toPreviousPageAriaLabel: t('listControls.pagination.previous'),
      }}
    />
  )
}

export function FilteredListToolbar({ list, id, label, placeholder }: Props & { placeholder: string }) {
  const { t } = useTranslation()
  return (
    <div className="filtered-list-toolbar">
      <div className="filtered-list-search">
        <SearchInput
          value={list.search}
          aria-label={t('listControls.search', { list: label })}
          placeholder={placeholder}
          onChange={(_, value) => list.setSearch(value)}
          onClear={() => list.setSearch('')}
          resetButtonLabel={t('listControls.clearSearch')}
        />
        <span className="filtered-list-count" role="status" aria-live="polite" aria-atomic="true">
          {t('listControls.filteredOf', { filtered: list.filteredCount, total: list.totalCount })}
        </span>
      </div>
      <FilteredListPagination list={list} id={id} label={label} />
    </div>
  )
}

export function FilteredListEmptyState({ colSpan, onClear }: { colSpan: number; onClear: () => void }) {
  const { t } = useTranslation()
  return (
    <Tr>
      <Td colSpan={colSpan} className="filtered-list-empty">
        <div>{t('listControls.noMatches')}</div>
        <Button variant="link" onClick={onClear}>{t('listControls.clearSearch')}</Button>
      </Td>
    </Tr>
  )
}
