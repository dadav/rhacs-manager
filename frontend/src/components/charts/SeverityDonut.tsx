import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslation } from 'react-i18next'
import { Severity } from '../../types'

const COLORS: Record<number, string> = {
  [Severity.CRITICAL]: '#c9190b',
  [Severity.IMPORTANT]: '#ec7a08',
  [Severity.MODERATE]: '#f0ab00',
  [Severity.LOW]: '#0066cc',
  [Severity.UNKNOWN]: '#8a8d90',
}

interface Props {
  data: { severity: Severity; count: number }[]
  onSegmentClick?: (severity: Severity) => void
}

export function SeverityDonut({ data, onSegmentClick }: Props) {
  const { t } = useTranslation()

  const labels: Record<number, string> = {
    [Severity.CRITICAL]: t('severity.4'),
    [Severity.IMPORTANT]: t('severity.3'),
    [Severity.MODERATE]: t('severity.2'),
    [Severity.LOW]: t('severity.1'),
    [Severity.UNKNOWN]: t('severity.0'),
  }

  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({
      name: labels[d.severity] ?? t('severity.0'),
      value: d.count,
      color: COLORS[d.severity] ?? '#8a8d90',
      severity: d.severity,
    }))

  if (!chartData.length) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73' }}>
        {t('common.noData')}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          style={onSegmentClick ? { cursor: 'pointer' } : undefined}
          onClick={onSegmentClick ? (_data, index) => {
            onSegmentClick(chartData[index].severity)
          } : undefined}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val, name) => [val, name]}
          contentStyle={{
            backgroundColor: 'var(--pf-t--global--background--color--primary--default, #fff)',
            border: '1px solid var(--pf-t--global--border--color--default, #d2d2d2)',
            color: 'var(--pf-t--global--text--color--regular, #151515)',
          }}
          wrapperStyle={{ zIndex: 10 }}
        />
        <Legend wrapperStyle={{ color: 'inherit' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
