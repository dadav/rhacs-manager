import { Label } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'

const COLORS = { 1: 'orange', 2: 'red', 3: 'purple' } as const

export function EscalationLevelBadge({ level }: { level: number }) {
  const { t } = useTranslation()
  const labels: Record<number, string> = {
    0: t('escalationStatus.notTriggered'),
    1: t('escalations.level1'),
    2: t('escalations.level2'),
    3: t('escalations.levelCritical'),
  }
  return <Label color={COLORS[level as keyof typeof COLORS] ?? 'grey'}>{labels[level] ?? t('escalationStatus.level', { level })}</Label>
}
