import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { CveTrendPoint } from '../../types'
import {
  chartTooltipStyle, chartTooltipWrapperStyle, TREND_LEGEND_ORDER,
  TREND_SEVERITY_KEYS, TREND_SEVERITY_COLORS, TREND_SEVERITY_LABEL_KEY,
} from '../../tokens'
import { TrendLegend } from './TrendLegend'

export function NewCvesBarChart({ data }: { data: CveTrendPoint[] }) {
  const { t, i18n } = useTranslation()
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: '2-digit' })
  const formatWeek = (value: string) => {
    const parts = dateFormatter.formatToParts(new Date(`${value}T00:00:00`))
    return `${parts.find(part => part.type === 'day')?.value}.${parts.find(part => part.type === 'month')?.value}.`
  }
  const hasData = data.some(row => TREND_SEVERITY_KEYS.some(key => row[key] > 0))

  return (
    <div role="img" aria-label={t('dashboard.trend')}>
      {!hasData ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 13 }}>
          {t('dashboard.trendEmpty')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--pf-t--global--border--color--default, #d2d2d2)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor' }} tickFormatter={formatWeek} />
            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} allowDecimals={false} />
            <Tooltip
              wrapperStyle={chartTooltipWrapperStyle}
              content={({ active, label }) => {
                const row = data.find(point => point.date === label)
                if (!active || !row) return null
                return (
                  <div style={{ ...chartTooltipStyle, padding: 10 }}>
                    <div>{t('dashboard.trendWeekOf', { date: formatWeek(row.date) })}</div>
                    {TREND_LEGEND_ORDER.map(key => (
                      <div key={key} style={{ color: TREND_SEVERITY_COLORS[key] }}>
                        {t(TREND_SEVERITY_LABEL_KEY[key])}: {row[key]}
                      </div>
                    ))}
                    <strong>{t('dashboard.trendTotal')}: {TREND_SEVERITY_KEYS.reduce((total, key) => total + row[key], 0)}</strong>
                  </div>
                )
              }}
            />
            <Legend verticalAlign="top" height={28} content={<TrendLegend />} />
            {TREND_SEVERITY_KEYS.map(key => (
              <Bar key={key} dataKey={key} stackId="severity" name={t(TREND_SEVERITY_LABEL_KEY[key])} fill={TREND_SEVERITY_COLORS[key]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
