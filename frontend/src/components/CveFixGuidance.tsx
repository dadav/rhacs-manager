import { Card, CardBody, CardTitle, Label } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useScopedLink } from '../hooks/useScope'
import { FIXABLE_COLOR } from '../tokens'
import type { AffectedComponent, ComponentPlacement } from '../types'

interface Props {
  placements: ComponentPlacement[]
  components: AffectedComponent[]
}

const MONO: React.CSSProperties = { fontFamily: 'monospace' }
const MONO_SMALL: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 }
const SUBTLE_LINE: React.CSSProperties = { fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)', marginTop: 2 }

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
      <CardBody style={{ padding: 0 }}>
        <Table variant="compact" aria-label={t('fixGuidance.title')}>
          <Thead><Tr>{columns.map(column => <Th key={column}>{t(column)}</Th>)}</Tr></Thead>
          <Tbody>
            {placements.length ? placements.map(placement => (
              <Tr key={JSON.stringify([placement.image_id, placement.component_name, placement.component_version, placement.location, placement.source])}>
                <Td dataLabel={t(columns[0])}><Link to={scopedLink(`/images/${encodeURIComponent(placement.image_id)}`)}>{placement.image_name}</Link></Td>
                <Td dataLabel={t(columns[1])} style={MONO}>{placement.component_name}</Td>
                <Td dataLabel={t(columns[2])} style={MONO_SMALL}>{placement.component_version}</Td>
                <Td dataLabel={t(columns[3])} style={MONO_SMALL}>{placement.fixed_by || '–'}</Td>
                <Td dataLabel={t(columns[4])}>
                  <code title={placement.location ?? undefined} style={{ overflowWrap: 'anywhere' }}>{placement.location || '–'}</code>
                  {placement.embedded_in && <div style={SUBTLE_LINE}>{t('fixGuidance.embedded', { file: placement.embedded_in })}</div>}
                  {placement.cves_at_location != null && placement.cves_at_location > 1 && <div style={{ marginTop: 2 }}><Label isCompact color="blue">{t('fixGuidance.cvesInFile', { count: placement.cves_at_location })}</Label></div>}
                </Td>
              </Tr>
            )) : components.map((component, index) => (
              <Tr key={index}>
                <Td dataLabel={t(columns[0])} style={MONO}>{component.component_name}</Td>
                <Td dataLabel={t(columns[1])} style={MONO_SMALL}>{component.component_version}</Td>
                <Td dataLabel={t(columns[2])}>
                  {component.fixable ? <span style={{ color: FIXABLE_COLOR }}>✓</span> : <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>✗</span>}
                </Td>
                <Td dataLabel={t(columns[3])} style={MONO_SMALL}>{component.fixed_by || '–'}</Td>
                <Td dataLabel={t(columns[4])}>{t(`cves.origin.${component.origin ?? 'unknown'}`)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardBody>
    </Card>
  )
}
