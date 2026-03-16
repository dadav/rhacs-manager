import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { CveTrendPoint } from '../../types'

// Bottom-to-top stacking order (low at bottom, critical on top)
const SEVERITY_KEYS = ['low', 'moderate', 'important', 'critical'] as const
// Legend display order (critical first)
const LEGEND_ORDER = ['critical', 'important', 'moderate', 'low'] as const

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#c9190b',
  important: '#ec7a08',
  moderate: '#f0ab00',
  low: '#0066cc',
}

const SEVERITY_LABEL_KEY: Record<string, string> = {
  critical: 'severity.4',
  important: 'severity.3',
  moderate: 'severity.2',
  low: 'severity.1',
}

interface Props {
  data: CveTrendPoint[]
}

export function TrendLine({ data }: Props) {
  const { t } = useTranslation()

  if (!data.length) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73', fontSize: 13 }}>
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
        <defs>
          {SEVERITY_KEYS.map(key => (
            <linearGradient key={key} id={`trendGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SEVERITY_COLORS[key]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={SEVERITY_COLORS[key]} stopOpacity={0} />
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
          contentStyle={{
            backgroundColor: 'var(--pf-v6-global--BackgroundColor--100, var(--pf-t--global--background--color--primary--default, #fff))',
            border: '1px solid var(--pf-t--global--border--color--default, #d2d2d2)',
            color: 'var(--pf-v6-global--Color--100, var(--pf-t--global--text--color--regular, #151515))',
          }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          wrapperStyle={{ fontSize: 11 }}
          content={() => (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11 }}>
              {LEGEND_ORDER.map(key => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, backgroundColor: SEVERITY_COLORS[key], borderRadius: 2, display: 'inline-block' }} />
                  {t(SEVERITY_LABEL_KEY[key])}
                </span>
              ))}
            </div>
          )}
        />
        {SEVERITY_KEYS.map(key => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={t(SEVERITY_LABEL_KEY[key])}
            stroke={SEVERITY_COLORS[key]}
            fill={`url(#trendGradient-${key})`}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
