import { Card, CardBody, CardTitle, Label } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useScopedLink } from '../hooks/useScope'
import { useFilteredPagination } from '../hooks/useFilteredPagination'
import { FIXABLE_COLOR } from '../tokens'
import type { AffectedComponent, ComponentPlacement } from '../types'
import { FilteredListEmptyState, FilteredListPagination, FilteredListToolbar } from './common/FilteredListControls'
import './CveFixGuidance.css'

interface Props {
  placements: ComponentPlacement[]
  components: AffectedComponent[]
}

const MONO: React.CSSProperties = { fontFamily: 'monospace' }
const SUBTLE_LINE: React.CSSProperties = { fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)', marginTop: 2 }

function isPlacement(row: AffectedComponent | ComponentPlacement): row is ComponentPlacement {
  return 'image_id' in row
}

export function CveFixGuidance({ placements, components }: Props) {
  const { t } = useTranslation()
  const scopedLink = useScopedLink()
  const list = useFilteredPagination<AffectedComponent | ComponentPlacement>(
    placements.length ? placements : components,
    row => [
      row.component_name, row.component_version, row.fixed_by,
      ...(isPlacement(row)
        ? [row.image_name, row.location, row.embedded_in]
        : [t(`cves.origin.${row.origin ?? 'unknown'}`)]),
    ],
  )
  if (!list.totalCount) return null

  const title = t('fixGuidance.title')
  const columns = placements.length
    ? ['fixGuidance.imageAndComponent', 'fixGuidance.path']
    : ['cves.componentName', 'cves.componentVersion', 'cves.fixable', 'cves.fixVersion', 'cves.componentOrigin']

  return (
    <Card className="cve-fix-guidance">
      <CardTitle>{title}</CardTitle>
      <CardBody>
        <FilteredListToolbar list={list} id="cve-fixes" label={title} placeholder={t(placements.length ? 'fixGuidance.searchPlaceholder' : 'fixGuidance.componentSearchPlaceholder')} />
      </CardBody>
      <CardBody style={{ padding: 0, minWidth: 0 }}>
        <Table variant="compact" aria-label={title} className="cve-fix-guidance-table">
          <Thead>
            <Tr>{columns.map((column, index) => <Th key={column} width={placements.length ? (index === 0 ? 60 : 40) : undefined}>{t(column)}</Th>)}</Tr>
          </Thead>
          <Tbody>
            {list.pageItems.map(row => isPlacement(row) ? (
              <Tr key={JSON.stringify([row.image_id, row.component_name, row.component_version, row.location, row.source])}>
                <Td dataLabel={t(columns[0])}>
                  <div className="cve-fix-guidance-content">
                    <Link to={scopedLink(`/images/${encodeURIComponent(row.image_id)}`)}>{row.image_name}</Link>
                    <dl className="cve-fix-guidance-details">
                      <div><dt>{t('cves.componentName')}</dt><dd>{row.component_name}</dd></div>
                      <div><dt>{t('cves.componentVersion')}</dt><dd>{row.component_version}</dd></div>
                      <div><dt>{t('cves.fixVersion')}</dt><dd>{row.fixed_by || '–'}</dd></div>
                    </dl>
                  </div>
                </Td>
                <Td dataLabel={t(columns[1])}>
                  <div className="cve-fix-guidance-content">
                    <code title={row.location ?? undefined}>{row.location || '–'}</code>
                    {row.embedded_in && <div style={SUBTLE_LINE}>{t('fixGuidance.embedded', { file: row.embedded_in })}</div>}
                    {row.cves_at_location != null && row.cves_at_location > 1 && <div style={{ marginTop: 2 }}><Label isCompact color="blue">{t('fixGuidance.cvesInFile', { count: row.cves_at_location })}</Label></div>}
                  </div>
                </Td>
              </Tr>
            ) : (
              <Tr key={JSON.stringify([row.component_name, row.component_version, row.origin])}>
                <Td dataLabel={t(columns[0])} style={MONO}>{row.component_name}</Td>
                <Td dataLabel={t(columns[1])} style={MONO}>{row.component_version}</Td>
                <Td dataLabel={t(columns[2])}>
                  {row.fixable ? <span style={{ color: FIXABLE_COLOR }}>✓</span> : <span style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>✗</span>}
                </Td>
                <Td dataLabel={t(columns[3])} style={MONO}>{row.fixed_by || '–'}</Td>
                <Td dataLabel={t(columns[4])}>{t(`cves.origin.${row.origin ?? 'unknown'}`)}</Td>
              </Tr>
            ))}
            {!list.filteredCount && <FilteredListEmptyState colSpan={columns.length} onClear={() => list.setSearch('')} />}
          </Tbody>
        </Table>
      </CardBody>
      {list.filteredCount > list.perPage && <CardBody><FilteredListPagination list={list} id="cve-fixes" label={title} position="bottom" /></CardBody>}
    </Card>
  )
}
