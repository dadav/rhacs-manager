import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Severity } from '../../types'

const DOT_COLORS: Record<number, string> = {
  [Severity.CRITICAL]: '#c9190b',
  [Severity.IMPORTANT]: '#ec7a08',
  [Severity.MODERATE]: '#f0ab00',
  [Severity.LOW]: '#0066cc',
  [Severity.UNKNOWN]: '#8a8d90',
}

interface Point {
  cve_id: string
  cvss: number
  epss: number
  severity: Severity
}

interface Props {
  data: Point[]
}

interface TooltipPayload {
  payload?: Point
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div style={{ background: '#fff', border: '1px solid #d2d2d2', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
      <strong>{d.cve_id}</strong>
      <div>CVSS: {d.cvss.toFixed(1)}</div>
      <div>EPSS: {(d.epss * 100).toFixed(1)}%</div>
    </div>
  )
}

export function EpssRiskMatrix({ data }: Props) {
  // Group by severity for multiple scatter series
  const bySeverity = data.reduce<Record<number, Point[]>>((acc, p) => {
    if (!acc[p.severity]) acc[p.severity] = []
    acc[p.severity].push(p)
    return acc
  }, {})

  return (
    <div>
      <div style={{ fontSize: 11, color: '#6a6e73', marginBottom: 8, display: 'flex', gap: 16 }}>
        {Object.entries(DOT_COLORS).map(([sev, color]) => (
          <span key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {['Unbekannt', 'Niedrig', 'Mittel', 'Wichtig', 'Kritisch'][Number(sev)]}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number"
            dataKey="epss"
            name="EPSS"
            domain={[0, 1]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            label={{ value: 'EPSS', position: 'insideBottom', offset: -10, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="cvss"
            name="CVSS"
            domain={[0, 10]}
            label={{ value: 'CVSS', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0.1} stroke="#ec7a08" strokeDasharray="4 4" label={{ value: 'EPSS 10%', fontSize: 10 }} />
          <ReferenceLine y={7} stroke="#c9190b" strokeDasharray="4 4" label={{ value: 'CVSS 7', fontSize: 10 }} />
          {Object.entries(bySeverity).map(([sev, points]) => (
            <Scatter
              key={sev}
              data={points}
              fill={DOT_COLORS[Number(sev)] ?? '#8a8d90'}
              fillOpacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
