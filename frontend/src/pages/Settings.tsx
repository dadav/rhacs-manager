import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core'
import { getErrorMessage } from '../utils/errors'
import { useEffect, useState } from 'react'
import { useSettings, useThresholdPreview, useUpdateSettings } from '../api/settings'
import type { EscalationRule } from '../types'

const SEVERITY_OPTIONS = [
  { value: 1, label: 'Gering' },
  { value: 2, label: 'Mittel' },
  { value: 3, label: 'Hoch' },
  { value: 4, label: 'Kritisch' },
]

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
}: {
  rule: EscalationRule
  onChange: (r: EscalationRule) => void
  onDelete: () => void
}) {
  return (
    <tr>
      <td style={{ padding: '6px 8px' }}>
        <select
          value={rule.severity_min}
          onChange={e => onChange({ ...rule, severity_min: Number(e.target.value) })}
          style={{ width: 120, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        >
          {SEVERITY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px 8px' }}>
        <select
          value={rule.epss_threshold}
          onChange={e => onChange({ ...rule, epss_threshold: Number(e.target.value) })}
          style={{ width: 90, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        >
          {EPSS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input
          type="number" min={1}
          value={rule.days_to_level1}
          onChange={e => onChange({ ...rule, days_to_level1: Number(e.target.value) })}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input
          type="number" min={1}
          value={rule.days_to_level2}
          onChange={e => onChange({ ...rule, days_to_level2: Number(e.target.value) })}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <input
          type="number" min={1}
          value={rule.days_to_level3}
          onChange={e => onChange({ ...rule, days_to_level3: Number(e.target.value) })}
          style={{ width: 70, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
        />
      </td>
      <td style={{ padding: '6px 8px' }}>
        <Button variant="plain" onClick={onDelete} style={{ color: '#c9190b', fontSize: 12 }}>✕</Button>
      </td>
    </tr>
  )
}

export function Settings() {
  const { data: settings, isLoading, error } = useSettings()
  const updateSettings = useUpdateSettings()

  const [minCvss, setMinCvss] = useState(0)
  const [minEpss, setMinEpss] = useState(0)
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([])
  const [escalationWarningDays, setEscalationWarningDays] = useState(3)
  const [digestDay, setDigestDay] = useState(1)
  const [managementEmail, setManagementEmail] = useState('')
  const [saved, setSaved] = useState(false)

  const preview = useThresholdPreview(minCvss, minEpss)

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

  if (isLoading) return <PageSection><Spinner aria-label="Laden" /></PageSection>
  if (error) return <PageSection><Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} /></PageSection>

  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">Einstellungen</Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Threshold config */}
          <GridItem span={12}>
            <Card>
              <CardTitle>CVE-Schwellenwerte</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 16 }}>
                  CVEs, die beide Schwellenwerte unterschreiten, werden für Nutzer ausgeblendet.
                  Priorisierte CVEs und CVEs mit aktiven Risikoakzeptanzen sind immer sichtbar.
                </p>
                <Grid hasGutter>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Minimaler CVSS-Score: {minCvss.toFixed(1)}</label>
                    <input
                      type="range" min={0} max={10} step={0.1}
                      value={minCvss}
                      onChange={e => setMinCvss(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={5}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Minimaler EPSS-Score: {(minEpss * 100).toFixed(1)}%</label>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={minEpss}
                      onChange={e => setMinEpss(parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  </GridItem>
                  <GridItem span={12}>
                    {preview.data && (
                      <p style={{ fontSize: 13, color: '#6a6e73' }}>
                        Vorschau: <strong>{preview.data.visible_cves}</strong> von {preview.data.total_cves} CVEs sichtbar
                        ({preview.data.hidden_cves} ausgeblendet)
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
              <CardTitle>Eskalationsregeln</CardTitle>
              <CardBody>
                <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 12 }}>
                  CVEs, die unbehandelt bleiben, werden nach den konfigurierten Tagen eskaliert.
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--pf-t--global--background--color--secondary--default)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Min. Schweregrad</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Min. EPSS</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tage → L1</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tage → L2</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tage → L3</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {escalationRules.map((rule, i) => (
                        <EscalationRuleRow
                          key={i}
                          rule={rule}
                          onChange={r => setEscalationRules(rs => rs.map((x, j) => j === i ? r : x))}
                          onDelete={() => setEscalationRules(rs => rs.filter((_, j) => j !== i))}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button variant="link" onClick={addRule} style={{ marginTop: 8 }}>+ Regel hinzufügen</Button>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #d2d2d2' }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Vorwarnzeit (Tage)</label>
                  <p style={{ fontSize: 12, color: '#6a6e73', margin: '4px 0 8px' }}>
                    Nutzer werden so viele Tage vor einer bevorstehenden Eskalation gewarnt.
                  </p>
                  <input
                    type="number" min={1} max={14} step={1}
                    value={escalationWarningDays}
                    onChange={e => setEscalationWarningDays(Number(e.target.value))}
                    style={{ width: 80, height: 32, padding: '0 6px', border: '1px solid #d2d2d2', borderRadius: 4 }}
                  />
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Notification settings */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Benachrichtigungen</CardTitle>
              <CardBody>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Wochentag für Digest-E-Mail</label>
                  <select
                    value={digestDay}
                    onChange={e => setDigestDay(Number(e.target.value))}
                    style={{ display: 'block', width: '100%', height: 36, padding: '0 8px', border: '1px solid #d2d2d2', borderRadius: 4, marginTop: 4 }}
                  >
                    {DAYS.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Management-E-Mail (für Eskalationen)</label>
                  <TextInput
                    type="email"
                    value={managementEmail}
                    onChange={(_, v) => setManagementEmail(v)}
                    placeholder="security@example.com"
                    style={{ marginTop: 4 }}
                  />
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Save */}
          <GridItem span={12}>
            {saved && <Alert variant="success" isInline title="Einstellungen gespeichert." style={{ marginBottom: 12 }} />}
            {updateSettings.isError && (
              <Alert variant="danger" isInline title={`Fehler: ${getErrorMessage(updateSettings.error)}`} style={{ marginBottom: 12 }} />
            )}
            <Button variant="primary" onClick={handleSave} isLoading={updateSettings.isPending}>
              Einstellungen speichern
            </Button>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  )
}
