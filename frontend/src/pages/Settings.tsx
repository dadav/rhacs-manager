import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Grid,
  GridItem,
  NumberInput,
  PageSection,
  Popover,
  Skeleton,
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
        <FormSelect
          value={rule.severity_min}
          onChange={(_e, v) => onChange({ ...rule, severity_min: Number(v) })}
          aria-label={t('settings.severityMin')}
          style={{ width: 120 }}
        >
          {severityOptions.map(o => (
            <FormSelectOption key={o.value} value={o.value} label={o.label} />
          ))}
        </FormSelect>
      </Td>
      <Td>
        <FormSelect
          value={rule.epss_threshold}
          onChange={(_e, v) => onChange({ ...rule, epss_threshold: Number(v) })}
          aria-label={t('settings.minEpssCol')}
          style={{ width: 90 }}
        >
          {EPSS_OPTIONS.map(o => (
            <FormSelectOption key={o.value} value={o.value} label={o.label} />
          ))}
        </FormSelect>
      </Td>
      <Td>
        <NumberInput
          value={rule.days_to_level1}
          min={1}
          onMinus={() => onChange({ ...rule, days_to_level1: Math.max(1, rule.days_to_level1 - 1) })}
          onPlus={() => onChange({ ...rule, days_to_level1: rule.days_to_level1 + 1 })}
          onChange={e => onChange({ ...rule, days_to_level1: Number((e.target as HTMLInputElement).value) })}
          inputAriaLabel={t('settings.daysToLevel1')}
          style={{ width: 120 }}
        />
      </Td>
      <Td>
        <NumberInput
          value={rule.days_to_level2}
          min={1}
          onMinus={() => onChange({ ...rule, days_to_level2: Math.max(1, rule.days_to_level2 - 1) })}
          onPlus={() => onChange({ ...rule, days_to_level2: rule.days_to_level2 + 1 })}
          onChange={e => onChange({ ...rule, days_to_level2: Number((e.target as HTMLInputElement).value) })}
          inputAriaLabel={t('settings.daysToLevel2')}
          style={{ width: 120 }}
        />
      </Td>
      <Td>
        <NumberInput
          value={rule.days_to_level3}
          min={1}
          onMinus={() => onChange({ ...rule, days_to_level3: Math.max(1, rule.days_to_level3 - 1) })}
          onPlus={() => onChange({ ...rule, days_to_level3: rule.days_to_level3 + 1 })}
          onChange={e => onChange({ ...rule, days_to_level3: Number((e.target as HTMLInputElement).value) })}
          inputAriaLabel={t('settings.daysToLevel3')}
          style={{ width: 120 }}
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

  if (isLoading) return (
    <PageSection>
      <Title headingLevel="h1" size="xl" style={{ marginBottom: 16 }}>{t('settings.title')}</Title>
      <Grid hasGutter>
        <GridItem span={12}><Card><CardBody><Skeleton height="120px" /></CardBody></Card></GridItem>
        <GridItem span={12}><Card><CardBody><Skeleton height="200px" /></CardBody></Card></GridItem>
        <GridItem span={6}><Card><CardBody><Skeleton height="180px" /></CardBody></Card></GridItem>
      </Grid>
    </PageSection>
  )
  if (error) return <PageSection><Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} /></PageSection>

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">{t('settings.title')}</Title>
      </PageSection>

      <PageSection variant="default" isFilled>
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
                  <GridItem sm={12} md={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>{t('settings.minCvssLabel', { value: minCvss.toFixed(1) })}</label>
                    <input
                      type="range" min={0} max={10} step={0.1}
                      value={minCvss}
                      onChange={e => setMinCvss(parseFloat(e.target.value))}
                      aria-label={t('settings.minCvssLabel', { value: minCvss.toFixed(1) })}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem sm={12} md={5}>
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
                    {preview.data ? (
                      <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)' }}>
                        {t('settings.preview', {
                          visible: preview.data.visible_cves,
                          total: preview.data.total_cves,
                          hidden: preview.data.hidden_cves,
                        })}
                      </p>
                    ) : preview.isFetching ? (
                      <Skeleton width="60%" height="18px" />
                    ) : null}
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
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--pf-t--global--border--color--default)' }}>
                  <FormGroup
                    label={t('settings.warningDays')}
                    labelHelp={<HelpButton header={t('settings.warningDays')} body={t('settings.warningDaysHelpBody')} />}
                  >
                    <NumberInput
                      value={escalationWarningDays}
                      min={1}
                      max={14}
                      onMinus={() => setEscalationWarningDays(v => Math.max(1, v - 1))}
                      onPlus={() => setEscalationWarningDays(v => Math.min(14, v + 1))}
                      onChange={e => setEscalationWarningDays(Number((e.target as HTMLInputElement).value))}
                      inputAriaLabel={t('settings.warningDays')}
                      style={{ width: 150 }}
                    />
                  </FormGroup>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Notification settings */}
          <GridItem sm={12} md={6}>
            <Card>
              <CardTitle>{t('settings.notifications')}</CardTitle>
              <CardBody>
                <FormGroup
                  label={t('settings.digestDayLabel')}
                  labelHelp={<HelpButton header={t('settings.digestDayLabel')} body={t('settings.digestDayHelpBody')} />}
                  style={{ marginBottom: 16 }}
                >
                  <FormSelect
                    value={digestDay}
                    onChange={(_e, v) => setDigestDay(Number(v))}
                    aria-label={t('settings.digestDayLabel')}
                  >
                    {DAYS.map((day, i) => (
                      <FormSelectOption key={i} value={i} label={day} />
                    ))}
                  </FormSelect>
                </FormGroup>
                <FormGroup
                  label={t('settings.managementEmail')}
                  labelHelp={<HelpButton header={t('settings.managementEmail')} body={t('settings.managementEmailHelpBody')} />}
                >
                  <TextInput
                    type="email"
                    value={managementEmail}
                    onChange={(_, v) => setManagementEmail(v)}
                    placeholder={t('settings.managementEmailPlaceholder')}
                    aria-label={t('settings.managementEmail')}
                  />
                </FormGroup>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--pf-t--global--border--color--default)' }}>
                  <FormGroup
                    label={t('settings.sendDigest')}
                    labelHelp={<HelpButton header={t('settings.sendDigest')} body={t('settings.sendDigestHelpBody')} />}
                  >
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
                  </FormGroup>
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
