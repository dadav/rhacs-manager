import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Severity } from '../../types'

const COLORS: Record<number, string> = {
  [Severity.CRITICAL]: '#c9190b',
  [Severity.IMPORTANT]: '#ec7a08',
  [Severity.MODERATE]: '#f0ab00',
  [Severity.LOW]: '#0066cc',
  [Severity.UNKNOWN]: '#8a8d90',
}

const LABELS: Record<number, string> = {
  [Severity.CRITICAL]: 'Kritisch',
  [Severity.IMPORTANT]: 'Wichtig',
  [Severity.MODERATE]: 'Mittel',
  [Severity.LOW]: 'Niedrig',
  [Severity.UNKNOWN]: 'Unbekannt',
}

interface Props {
  data: { severity: Severity; count: number }[]
}

export function SeverityDonut({ data }: Props) {
  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({
      name: LABELS[d.severity] ?? 'Unbekannt',
      value: d.count,
      color: COLORS[d.severity] ?? '#8a8d90',
    }))

  if (!chartData.length) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73' }}>
        Keine Daten
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
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(val, name) => [val, name]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
