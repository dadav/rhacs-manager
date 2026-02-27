import { Label } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'
import { Severity } from '../../types'

const SEVERITY_CONFIG: Record<Severity, { color: 'red' | 'orange' | 'yellow' | 'blue' | 'grey'; labelKey: string }> = {
  [Severity.CRITICAL]: { color: 'red', labelKey: 'severity.4' },
  [Severity.IMPORTANT]: { color: 'orange', labelKey: 'severity.3' },
  [Severity.MODERATE]: { color: 'yellow', labelKey: 'severity.2' },
  [Severity.LOW]: { color: 'blue', labelKey: 'severity.1' },
  [Severity.UNKNOWN]: { color: 'grey', labelKey: 'severity.0' },
}

interface Props {
  severity: Severity
}

export function SeverityBadge({ severity }: Props) {
  const { t } = useTranslation()
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG[Severity.UNKNOWN]
  return (
    <Label color={config.color} isCompact>
      {t(config.labelKey)}
    </Label>
  )
}
