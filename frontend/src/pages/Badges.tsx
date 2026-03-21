import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Popover,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useState } from 'react'
import { useBadges, useCreateBadge, useDeleteBadge } from '../api/badges'
import { useScope } from '../hooks/useScope'
import { useTranslation } from 'react-i18next'

export function Badges() {
  const { t, i18n } = useTranslation()
  const { scopeParams } = useScope()
  const { data: badges, isLoading, error } = useBadges(scopeParams)
  const createBadge = useCreateBadge()
  const deleteBadge = useDeleteBadge()

  const [showCreate, setShowCreate] = useState(false)
  const [namespace, setNamespace] = useState('')
  const [cluster, setCluster] = useState('')
  const [label, setLabel] = useState('')
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const toAbsoluteBadgeUrl = (url: string) =>
    url.startsWith('http') ? url : new URL(url, window.location.origin).toString()

  async function handleCreate() {
    try {
      await createBadge.mutateAsync({
        namespace: namespace || null,
        cluster_name: cluster || null,
        label: label || undefined,
      })
      setShowCreate(false)
      setNamespace('')
      setCluster('')
      setLabel('')
      setFormError('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <PageSection variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title headingLevel="h1" size="xl">{t('badges.title')}</Title>
            <Popover
              headerContent={t('badges.whatAre')}
              bodyContent={
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    {t('badges.helpBody1')}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>{t('badges.helpBody2Scope')}</strong> — {t('badges.helpBody2ScopeDesc')}<br />
                    <strong>{t('badges.helpBody2Token')}</strong> — {t('badges.helpBody2TokenDesc')}<br />
                    <strong>{t('badges.helpBody2Embed')}</strong> — {t('badges.helpBody2EmbedDesc')}
                  </p>
                  <p style={{ margin: 0 }}>
                    {t('badges.helpBody3')}
                  </p>
                </div>
              }
              position="right"
            >
              <Button variant="plain" aria-label={t('badges.helpLabel')} style={{ padding: '4px 6px' }}>
                <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)' }} />
              </Button>
            </Popover>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>{t('badges.create')}</Button>
        </div>
      </PageSection>

      <PageSection>
        <Alert variant="info" isInline title={t('badges.hint')} style={{ marginBottom: 16 }} />

        {isLoading ? <Spinner aria-label={t('common.loading')} /> : error ? (
          <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
        ) : !badges?.length ? (
          <div>
            <Alert variant="info" isInline title={t('badges.noBadgesAvailable')} />
            <p style={{ marginTop: 8, color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
              {t('badges.noBadgesHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {badges.map(badge => (
              <Card key={badge.id} isCompact>
                <CardBody>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{badge.label || t('badges.cveBadge')}</div>
                      <div style={{ fontSize: 11, color: '#6a6e73', fontFamily: 'monospace' }}>
                        {badge.cluster_name}/{badge.namespace ?? t('badges.allScope')}
                      </div>
                    </div>

                    {/* Live badge preview */}
                    <div>
                      <img src={toAbsoluteBadgeUrl(badge.badge_url)} alt="Badge" style={{ height: 20 }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(toAbsoluteBadgeUrl(badge.badge_url), badge.id + '-url')}
                      >
                        {copied === badge.id + '-url' ? t('badges.copiedUrl') : t('badges.copyUrl')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(
                          `![CVE Badge](${toAbsoluteBadgeUrl(badge.badge_url)})`,
                          badge.id + '-md'
                        )}
                      >
                        {copied === badge.id + '-md' ? t('badges.copiedMd') : t('badges.markdownCopy')}
                      </Button>
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => deleteBadge.mutate(badge.id)}
                        aria-label={`${t('common.delete')} ${badge.label || t('badges.cveBadge')}`}
                        style={{ color: '#c9190b', fontSize: 12 }}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>

                  {/* URL display */}
                  <div style={{ marginTop: 8, padding: '6px 10px', background: '#f9f9f9', borderRadius: 3 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6a6e73', wordBreak: 'break-all' }}>
                      {toAbsoluteBadgeUrl(badge.badge_url)}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      {showCreate && (
        <Modal isOpen onClose={() => setShowCreate(false)} variant="small">
          <ModalHeader title={t('badges.create')} />
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#6a6e73' }}>
                {t('badges.createHint')}
              </p>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('badges.namespace')}</label>
                <TextInput value={namespace} onChange={(_, v) => setNamespace(v)} placeholder={t('badges.namspacePlaceholder')} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('badges.cluster')}</label>
                <TextInput value={cluster} onChange={(_, v) => setCluster(v)} placeholder={t('badges.clusterPlaceholder')} style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>{t('badges.labelOptional')}</label>
                <TextInput value={label} onChange={(_, v) => setLabel(v)} placeholder={t('badges.labelPlaceholder')} style={{ marginTop: 4 }} />
              </div>
              {formError && <Alert variant="danger" isInline title={formError} />}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="primary" onClick={handleCreate} isLoading={createBadge.isPending}>{t('common.create')}</Button>
            <Button variant="link" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
