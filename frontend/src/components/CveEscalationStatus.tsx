import { Card, CardBody, CardTitle, Label } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import type { EscalationLocation } from '../types'
import { formatDateTime } from '../utils/format'
import { EscalationLevelBadge } from './common/EscalationLevelBadge'
import { HelpPopover } from './common/HelpPopover'
import { useFilteredPagination } from '../hooks/useFilteredPagination'
import { FilteredListEmptyState, FilteredListPagination, FilteredListToolbar } from './common/FilteredListControls'

export function CveEscalationStatus({ locations }: { locations: EscalationLocation[] }) {
  const { t, i18n } = useTranslation()
  const list = useFilteredPagination(locations, location => [location.cluster_name, location.namespace, `${location.cluster_name}/${location.namespace}`])
  if (!locations.length) return null
  const title = t('escalationStatus.title')
  const columns = ['escalationStatus.location', 'escalationStatus.current', 'escalationStatus.triggered', 'escalationStatus.next']
  return (
    <Card style={{ minWidth: 0 }}>
      <CardTitle>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {t('escalationStatus.title')}
          <HelpPopover label={t('escalationStatus.helpLabel')}>{t('escalationStatus.explainer')}</HelpPopover>
        </span>
      </CardTitle>
      <CardBody>
        <FilteredListToolbar list={list} id="cve-escalations" label={title} placeholder={t('escalationStatus.searchPlaceholder')} />
      </CardBody>
      <CardBody style={{ padding: 0 }}>
        <Table variant="compact" aria-label={title} style={{ tableLayout: 'fixed', overflowWrap: 'anywhere' }}>
          <Thead><Tr>{columns.map(column => <Th key={column}>{t(column)}</Th>)}</Tr></Thead>
          <Tbody>{list.pageItems.map(location => (
            <Tr key={JSON.stringify([location.cluster_name, location.namespace])}>
              <Td dataLabel={t(columns[0])}>{location.cluster_name}/{location.namespace}</Td>
              <Td dataLabel={t(columns[1])}><EscalationLevelBadge level={location.level} /></Td>
              <Td dataLabel={t(columns[2])}>{formatDateTime(location.triggered_at, i18n.language)}</Td>
              <Td dataLabel={t(columns[3])}>
                {location.stopped_reason ? <Label isCompact color="grey">{t(`escalationStatus.${location.stopped_reason}`)}</Label>
                  : location.next_level_at && location.next_level != null
                    ? <><EscalationLevelBadge level={location.next_level} /> {formatDateTime(location.next_level_at, i18n.language)}</>
                    : '–'}
              </Td>
            </Tr>
          ))}
            {!list.filteredCount && <FilteredListEmptyState colSpan={columns.length} onClear={() => list.setSearch('')} />}
          </Tbody>
        </Table>
      </CardBody>
      {list.filteredCount > list.perPage && <CardBody><FilteredListPagination list={list} id="cve-escalations" label={title} position="bottom" /></CardBody>}
    </Card>
  )
}
