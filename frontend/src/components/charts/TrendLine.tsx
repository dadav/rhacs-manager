import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { CveTrendPoint } from '../../types'
import { chartTooltipStyle, TREND_SEVERITY_KEYS, TREND_SEVERITY_COLORS, TREND_SEVERITY_LABEL_KEY } from '../../tokens'
import { TrendLegend } from './TrendLegend'

interface Props {
  data: CveTrendPoint[]
}

export function TrendLine({ data }: Props) {
  const { t } = useTranslation()

  if (!data.length) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73', fontSize: 13 }}>
        {t('common.noData')}
      </div>
    )
  }

  return (
    <div role="img" aria-label={t('dashboard.trend')}>
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
        <defs>
          {TREND_SEVERITY_KEYS.map(key => (
            <linearGradient key={key} id={`trendGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TREND_SEVERITY_COLORS[key]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={TREND_SEVERITY_COLORS[key]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-t--global--border--color--default, #d2d2d2)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'currentColor' }}
          tickFormatter={d => d.slice(5)}
        />
        <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} allowDecimals={false} />
        <Tooltip
          labelFormatter={l => `Datum: ${l}`}
          contentStyle={chartTooltipStyle}
        />
        <Legend
          verticalAlign="top"
          height={28}
          wrapperStyle={{ fontSize: 11 }}
          content={<TrendLegend />}
        />
        {TREND_SEVERITY_KEYS.map(key => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={t(TREND_SEVERITY_LABEL_KEY[key])}
            stroke={TREND_SEVERITY_COLORS[key]}
            fill={`url(#trendGradient-${key})`}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}
