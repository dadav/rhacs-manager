import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { usePriority, useDeletePriority } from '../api/priorities'
import { useCurrentUser } from '../api/auth'
import { PriorityLevel } from '../types'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PRIORITY_COLORS, BRAND_BLUE } from '../tokens'

const PRIORITY_LEVEL_KEYS: { key: string; value: PriorityLevel }[] = [
  { key: 'priority.critical', value: PriorityLevel.critical },
  { key: 'priority.high', value: PriorityLevel.high },
  { key: 'priority.medium', value: PriorityLevel.medium },
  { key: 'priority.low', value: PriorityLevel.low },
]

function PriorityBadge({ level }: { level: PriorityLevel }) {
  const { t } = useTranslation()
  const option = PRIORITY_LEVEL_KEYS.find(o => o.value === level)
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 3,
      background: PRIORITY_COLORS[level],
      color: '#fff',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
    }}>
      {option ? t(option.key) : level}
    </span>
  )
}

export function PriorityDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US'
  const navigate = useNavigate()
  const { data: priority, isLoading, error } = usePriority(id ?? '')
  const { data: me } = useCurrentUser()
  const deletePriority = useDeletePriority()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (isLoading) return <PageSection><Spinner aria-label={t('common.loading')} /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} /></PageSection>
  if (!priority) return null

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem onClick={() => navigate('/priorities')} style={{ cursor: 'pointer' }}>
            {t('priorities.title')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{priority.cve_id}</BreadcrumbItem>
        </Breadcrumb>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Title headingLevel="h1" size="xl" style={{ fontFamily: 'monospace' }}>{priority.cve_id}</Title>
          <PriorityBadge level={priority.priority} />
          {me?.is_sec_team && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {deleteError && <Alert variant="danger" isInline isPlain title={deleteError} />}
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 13 }}>{t('priorities.deleteConfirm')}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deletePriority.isPending}
                    onClick={async () => {
                      try {
                        await deletePriority.mutateAsync(priority.id)
                        navigate('/priorities')
                      } catch (err) {
                        setDeleteError(getErrorMessage(err))
                      }
                    }}
                  >
                    {t('priorities.deleteFinal')}
                  </Button>
                  <Button variant="link" size="sm" onClick={() => setConfirmDelete(false)}>
                    {t('common.cancel')}
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  {t('priorities.delete')}
                </Button>
              )}
            </div>
          )}
        </div>
      </PageSection>

      <PageSection variant="default" isFilled>
        <Grid hasGutter>
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('common.details')}</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {([
                      [t('priorities.cveId'), <Link to={`/vulnerabilities/${priority.cve_id}`} style={{ fontFamily: 'monospace', color: BRAND_BLUE }}>{priority.cve_id}</Link>],
                      [t('priorities.priority'), <PriorityBadge level={priority.priority} />],
                      [t('priorities.setBy'), priority.set_by_name],
                      [t('priorities.deadline'), priority.deadline ? new Date(priority.deadline).toLocaleDateString(dateLocale) : '–'],
                      [t('priorities.createdAt'), new Date(priority.created_at).toLocaleDateString(dateLocale)],
                      [t('priorities.updatedAt'), new Date(priority.updated_at).toLocaleDateString(dateLocale)],
                    ] as [string, React.ReactNode][]).map(([label, value], i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--pf-t--global--border--color--default)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', width: 160 }}>{label}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card style={{ marginBottom: 16 }}>
              <CardTitle>{t('priorities.reasonLabel')}</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{priority.reason}</p>
              </CardBody>
            </Card>

          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
