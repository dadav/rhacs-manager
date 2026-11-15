import { Card, CardBody, CardTitle, Label } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import type { EscalationLocation } from '../types'
import { formatDateTime } from '../utils/format'
import { EscalationLevelBadge } from './common/EscalationLevelBadge'
import { HelpPopover } from './common/HelpPopover'

export function CveEscalationStatus({ locations }: { locations: EscalationLocation[] }) {
  const { t, i18n } = useTranslation()
  if (!locations.length) return null
  const columns = ['escalationStatus.location', 'escalationStatus.current', 'escalationStatus.triggered', 'escalationStatus.next']
  return (
    <Card>
      <CardTitle>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {t('escalationStatus.title')}
          <HelpPopover label={t('escalationStatus.helpLabel')}>{t('escalationStatus.explainer')}</HelpPopover>
        </span>
      </CardTitle>
      <CardBody style={{ padding: 0 }}>
        <Table variant="compact" aria-label={t('escalationStatus.title')}>
          <Thead><Tr>{columns.map(column => <Th key={column}>{t(column)}</Th>)}</Tr></Thead>
          <Tbody>{locations.map(location => (
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
          ))}</Tbody>
        </Table>
      </CardBody>
    </Card>
  )
}
