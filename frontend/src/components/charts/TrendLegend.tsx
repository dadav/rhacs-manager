import { useTranslation } from 'react-i18next'
import { TREND_LEGEND_ORDER, TREND_SEVERITY_COLORS, TREND_SEVERITY_LABEL_KEY } from '../../tokens'

export function TrendLegend() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11 }}>
      {TREND_LEGEND_ORDER.map(key => (
        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, backgroundColor: TREND_SEVERITY_COLORS[key], borderRadius: 2, display: 'inline-block' }} />
          {t(TREND_SEVERITY_LABEL_KEY[key])}
        </span>
      ))}
    </div>
  )
}
