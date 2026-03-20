import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Popover,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useState } from 'react'
import { useSendDigest, useSettings, useThresholdPreview, useUpdateSettings } from '../api/settings'
import { useTranslation } from 'react-i18next'
import type { EscalationRule } from '../types'

function HelpButton({ header, body, label }: { header: string; body: string; label?: string }) {
  const { t } = useTranslation()
  return (
    <Popover headerContent={header} bodyContent={body}>
      <button type="button" aria-label={label || t('settings.helpFor', { topic: header })} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex' }}>
        <OutlinedQuestionCircleIcon style={{ color: 'var(--pf-t--global--text--color--subtle)', fontSize: 14 }} />
      </button>
    </Popover>
  )
}

const EPSS_OPTIONS = [
  { value: 0.01, label: '1%' },
  { value: 0.05, label: '5%' },
  { value: 0.1, label: '10%' },
  { value: 0.2, label: '20%' },
  { value: 0.3, label: '30%' },
  { value: 0.5, label: '50%' },
  { value: 0.7, label: '70%' },
  { value: 0.9, label: '90%' },
]

function EscalationRuleRow({
  rule,
  onChange,
  onDelete,
  severityOptions,
}: {
  rule: EscalationRule
  onChange: (r: EscalationRule) => void
  onDelete: () => void
  severityOptions: { value: number; label: string }[]
}) {
  const { t } = useTranslation()
  return (
    <Tr>
      <Td>
        <select
          value={rule.severity_min}
          onChange={e => onChange({ ...rule, severity_min: Number(e.target.value) })}
          aria-label={t('settings.severityMin')}
          style={{ width: 120, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        >
          {severityOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Td>
      <Td>
        <select
          value={rule.epss_threshold}
          onChange={e => onChange({ ...rule, epss_threshold: Number(e.target.value) })}
          aria-label={t('settings.minEpssCol')}
          style={{ width: 90, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        >
          {EPSS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Td>
      <Td>
        <input
          type="number" min={1}
          value={rule.days_to_level1}
          onChange={e => onChange({ ...rule, days_to_level1: Number(e.target.value) })}
          aria-label={t('settings.daysToLevel1')}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </Td>
      <Td>
        <input
          type="number" min={1}
          value={rule.days_to_level2}
          onChange={e => onChange({ ...rule, days_to_level2: Number(e.target.value) })}
          aria-label={t('settings.daysToLevel2')}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </Td>
      <Td>
        <input
          type="number" min={1}
          value={rule.days_to_level3}
          onChange={e => onChange({ ...rule, days_to_level3: Number(e.target.value) })}
          aria-label={t('settings.daysToLevel3')}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </Td>
      <Td>
        <Button variant="plain" onClick={onDelete} style={{ color: '#c9190b', fontSize: 12 }}>✕</Button>
      </Td>
    </Tr>
  )
}

export function Settings() {
  const { t, i18n } = useTranslation()
  const { data: settings, isLoading, error } = useSettings()
  const updateSettings = useUpdateSettings()
  const sendDigest = useSendDigest()
  const [digestSent, setDigestSent] = useState(false)

  const [minCvss, setMinCvss] = useState(0)
  const [minEpss, setMinEpss] = useState(0)
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([])
  const [escalationWarningDays, setEscalationWarningDays] = useState(3)
  const [digestDay, setDigestDay] = useState(1)
  const [managementEmail, setManagementEmail] = useState('')
  const [saved, setSaved] = useState(false)

  const preview = useThresholdPreview(minCvss, minEpss)

  const SEVERITY_OPTIONS = [
    { value: 1, label: t('severity.1') },
    { value: 2, label: t('severity.2') },
    { value: 3, label: t('severity.3') },
    { value: 4, label: t('severity.4') },
  ]

  const DAYS = t('settings.digestDays', { returnObjects: true }) as string[]

  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US'

  useEffect(() => {
    if (settings) {
      setMinCvss(settings.min_cvss_score)
      setMinEpss(settings.min_epss_score)
      setEscalationRules(settings.escalation_rules ?? [])
      setEscalationWarningDays(settings.escalation_warning_days ?? 3)
      setDigestDay(settings.digest_day)
      setManagementEmail(settings.management_email)
    }
  }, [settings])

  async function handleSave() {
    await updateSettings.mutateAsync({
      min_cvss_score: minCvss,
      min_epss_score: minEpss,
      escalation_rules: escalationRules,
      escalation_warning_days: escalationWarningDays,
      digest_day: digestDay,
      management_email: managementEmail,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function addRule() {
    setEscalationRules(rs => [...rs, {
      severity_min: 3,
      epss_threshold: 0.1,
      days_to_level1: 30,
      days_to_level2: 60,
      days_to_level3: 90,
    }])
  }

  if (isLoading) return <PageSection><Spinner aria-label={t('common.loading')} /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} /></PageSection>

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('settings.title')}</Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Threshold config */}
          <GridItem span={12}>
            <Card>
              <CardTitle>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('settings.thresholds')}
                  <HelpButton header={t('settings.thresholds')} body={t('settings.thresholdHelpBody')} />
                </span>
              </CardTitle>
              <CardBody>
                <Grid hasGutter>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.minCvssLabel', { value: minCvss.toFixed(1) })}</label>
                    <input
                      type="range" min={0} max={10} step={0.1}
                      value={minCvss}
                      onChange={e => setMinCvss(parseFloat(e.target.value))}
                      aria-label={t('settings.minCvssLabel', { value: minCvss.toFixed(1) })}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.minEpssLabel', { value: (minEpss * 100).toFixed(1) })}</label>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={minEpss}
                      onChange={e => setMinEpss(parseFloat(e.target.value))}
                      aria-label={t('settings.minEpssLabel', { value: (minEpss * 100).toFixed(1) })}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={12}>
                    {preview.data && (
                      <p style={{ fontSize: 13, color: '#6a6e73' }}>
                        {t('settings.preview', {
                          visible: preview.data.visible_cves,
                          total: preview.data.total_cves,
                          hidden: preview.data.hidden_cves,
                        })}
                      </p>
                    )}
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </GridItem>

          {/* Escalation rules */}
          <GridItem span={12}>
            <Card>
              <CardTitle>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('settings.escalationRules')}
                  <HelpButton header={t('settings.escalationRules')} body={t('settings.escalationRulesHelpBody')} />
                </span>
              </CardTitle>
              <CardBody>
                <div style={{ overflowX: 'auto' }}>
                  <Table variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('settings.severityMin')}</Th>
                        <Th>{t('settings.minEpssCol')}</Th>
                        <Th>{t('settings.daysToLevel1')}</Th>
                        <Th>{t('settings.daysToLevel2')}</Th>
                        <Th>{t('settings.daysToLevel3')}</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {escalationRules.map((rule, i) => (
                        <EscalationRuleRow
                          key={i}
                          rule={rule}
                          severityOptions={SEVERITY_OPTIONS}
                          onChange={r => setEscalationRules(rs => rs.map((x, j) => j === i ? r : x))}
                          onDelete={() => setEscalationRules(rs => rs.filter((_, j) => j !== i))}
                        />
                      ))}
                    </Tbody>
                  </Table>
                </div>
                <Button variant="link" onClick={addRule} style={{ marginTop: 8 }}>{t('settings.addRule')}</Button>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #d2d2d2' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('settings.warningDays')}
                    <HelpButton header={t('settings.warningDays')} body={t('settings.warningDaysHelpBody')} />
                  </label>
                  <input
                    type="number" min={1} max={14} step={1}
                    value={escalationWarningDays}
                    onChange={e => setEscalationWarningDays(Number(e.target.value))}
                    aria-label={t('settings.warningDays')}
                    style={{ width: 80, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
                  />
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Notification settings */}
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('settings.notifications')}</CardTitle>
              <CardBody>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('settings.digestDayLabel')}
                    <HelpButton header={t('settings.digestDayLabel')} body={t('settings.digestDayHelpBody')} />
                  </label>
                  <select
                    value={digestDay}
                    onChange={e => setDigestDay(Number(e.target.value))}
                    aria-label={t('settings.digestDayLabel')}
                    style={{ display: 'block', width: '100%', height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4, marginTop: 4 }}
                  >
                    {DAYS.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t('settings.managementEmail')}
                    <HelpButton header={t('settings.managementEmail')} body={t('settings.managementEmailHelpBody')} />
                  </label>
                  <TextInput
                    type="email"
                    value={managementEmail}
                    onChange={(_, v) => setManagementEmail(v)}
                    placeholder={t('settings.managementEmailPlaceholder')}
                    style={{ marginTop: 4 }}
                  />
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #d2d2d2' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    {t('settings.sendDigest')}
                    <HelpButton header={t('settings.sendDigest')} body={t('settings.sendDigestHelpBody')} />
                  </label>
                  {digestSent && <Alert variant="success" isInline title={t('settings.digestSent')} style={{ marginBottom: 8 }} />}
                  {sendDigest.isError && (
                    <Alert variant="danger" isInline title={`${t('common.error')}: ${getErrorMessage(sendDigest.error)}`} style={{ marginBottom: 8 }} />
                  )}
                  <Button
                    variant="secondary"
                    isLoading={sendDigest.isPending}
                    onClick={async () => {
                      setDigestSent(false)
                      sendDigest.reset()
                      await sendDigest.mutateAsync()
                      setDigestSent(true)
                      setTimeout(() => setDigestSent(false), 5000)
                    }}
                  >
                    {t('settings.sendNow')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Save */}
          <GridItem span={12}>
            {saved && <Alert variant="success" isInline title={t('settings.saved')} style={{ marginBottom: 12 }} />}
            {updateSettings.isError && (
              <Alert variant="danger" isInline title={`${t('common.error')}: ${getErrorMessage(updateSettings.error)}`} style={{ marginBottom: 12 }} />
            )}
            <Button variant="primary" onClick={handleSave} isLoading={updateSettings.isPending}>
              {t('settings.saveSettings')}
            </Button>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
