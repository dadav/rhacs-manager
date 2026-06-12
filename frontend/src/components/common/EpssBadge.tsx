import { Label, Tooltip } from '@patternfly/react-core'
import { useTranslation } from 'react-i18next'
import { formatEpssPercent } from '../../utils/format'

interface Props {
  value: number  // 0.0 - 1.0
}

export function EpssBadge({ value }: Props) {
  const { t } = useTranslation()

  let color: 'red' | 'yellow' | 'green' = 'green'
  if (value >= 0.5) color = 'red'
  else if (value >= 0.1) color = 'yellow'

  return (
    <Tooltip content={t('cves.epssTooltip')}>
      <Label color={color} isCompact>
        {formatEpssPercent(value)}
      </Label>
    </Tooltip>
  )
}
