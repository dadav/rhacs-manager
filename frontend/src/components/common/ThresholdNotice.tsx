import { Alert, AlertActionLink, PageSection } from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { useThresholds } from '../../api/settings'
import { useAuth } from '../../hooks/useAuth'
import { useScope } from '../../hooks/useScope'

/**
 * Page-level notice about the global CVSS/EPSS thresholds for non-sec-team users.
 *
 * - Thresholds active: explains the filter and offers "show all CVEs".
 * - User opted out (ignore_thresholds URL param): says so and offers to reapply.
 * Renders nothing for the sec team (no floor applies) or when no threshold is set.
 */
export function ThresholdNotice() {
  const { t } = useTranslation()
  const { isSecTeam } = useAuth()
  const { data: thresholds } = useThresholds()
  const { ignoreThresholds, setIgnoreThresholds } = useScope()

  if (isSecTeam || !thresholds) return null
  const hasActiveThresholds = thresholds.min_cvss_score > 0 || thresholds.min_epss_score > 0
  if (!hasActiveThresholds) return null

  const values = {
    cvss: thresholds.min_cvss_score.toFixed(1),
    epss: (thresholds.min_epss_score * 100).toFixed(0),
  }

  const alert = ignoreThresholds ? (
    <Alert
      variant="info"
      isInline
      isPlain
      customIcon={<InfoCircleIcon />}
      title={t('scope.thresholdsIgnoredNotice', values)}
      actionLinks={
        <AlertActionLink onClick={() => setIgnoreThresholds(false)}>
          {t('scope.reapplyThresholds')}
        </AlertActionLink>
      }
      style={{ padding: '8px 20px' }}
    />
  ) : (
    <Alert
      variant="info"
      isInline
      isPlain
      customIcon={<InfoCircleIcon />}
      title={t('cves.thresholdHint', values)}
      actionLinks={
        <AlertActionLink onClick={() => setIgnoreThresholds(true)}>
          {t('scope.showAllCves')}
        </AlertActionLink>
      }
      style={{ padding: '8px 20px' }}
    />
  )

  return (
    <PageSection variant="default" padding={{ default: 'noPadding' }}>
      {alert}
    </PageSection>
  )
}
