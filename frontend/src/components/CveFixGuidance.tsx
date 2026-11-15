import { Card, CardBody, CardTitle, Label } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useScopedLink } from '../hooks/useScope'
import type { AffectedComponent, ComponentPlacement } from '../types'

interface Props {
  placements: ComponentPlacement[]
  components: AffectedComponent[]
}

export function CveFixGuidance({ placements, components }: Props) {
  const { t } = useTranslation()
  const scopedLink = useScopedLink()
  if (!placements.length && !components.length) return null
  const columns = placements.length
    ? ['fixGuidance.image', 'cves.componentName', 'cves.componentVersion', 'cves.fixVersion', 'fixGuidance.path']
    : ['cves.componentName', 'cves.componentVersion', 'cves.fixable', 'cves.fixVersion', 'cves.componentOrigin']
  return (
    <Card>
      <CardTitle>{t('fixGuidance.title')}</CardTitle>
      <CardBody>
        <Table variant="compact" aria-label={t('fixGuidance.title')}>
          <Thead><Tr>{columns.map(column => <Th key={column}>{t(column)}</Th>)}</Tr></Thead>
          {placements.length ? placements.map(placement => (
            <Tbody key={JSON.stringify([placement.image_id, placement.component_name, placement.component_version, placement.location, placement.source])}>
              <Tr>
                <Td dataLabel={t(columns[0])}><Link to={scopedLink(`/images/${encodeURIComponent(placement.image_id)}`)}>{placement.image_name}</Link></Td>
                <Td dataLabel={t(columns[1])}>{placement.component_name}</Td>
                <Td dataLabel={t(columns[2])}>{placement.component_version}</Td>
                <Td dataLabel={t(columns[3])}>{placement.fixed_by || '-'}</Td>
                <Td dataLabel={t(columns[4])}>
                  <code title={placement.location ?? undefined} style={{ overflowWrap: 'anywhere' }}>{placement.location || '-'}</code>
                  {placement.cves_at_location != null && placement.cves_at_location > 1 && <div><Label color="blue">{t('fixGuidance.cvesInFile', { count: placement.cves_at_location })}</Label></div>}
                </Td>
              </Tr>
              {placement.embedded_in && <Tr><Td colSpan={5}>{t('fixGuidance.embedded', { file: placement.embedded_in })}</Td></Tr>}
            </Tbody>
          )) : <Tbody>{components.map((component, index) => (
            <Tr key={index}>
              <Td dataLabel={t(columns[0])}>{component.component_name}</Td>
              <Td dataLabel={t(columns[1])}>{component.component_version}</Td>
              <Td dataLabel={t(columns[2])}>{component.fixable ? '✓' : '✗'}</Td>
              <Td dataLabel={t(columns[3])}>{component.fixed_by || '-'}</Td>
              <Td dataLabel={t(columns[4])}>{t(`cves.origin.${component.origin ?? 'unknown'}`)}</Td>
            </Tr>
          ))}</Tbody>}
        </Table>
      </CardBody>
    </Card>
  )
}
