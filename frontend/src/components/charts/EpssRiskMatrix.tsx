import {
  CartesianGrid,
  ReferenceArea,
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

// Quadrant zones: use semi-transparent colors that work on both light and dark backgrounds
const ZONES = [
  { x1: 0,   x2: 0.1, y1: 0, y2: 7,  fill: '#1e8f19', label: 'Niedriges Risiko',  labelFill: '#1e8f19' },
  { x1: 0,   x2: 0.1, y1: 7, y2: 10, fill: '#ec7a08', label: 'Schwerwiegend',      labelFill: '#ec7a08' },
  { x1: 0.1, x2: 1,   y1: 0, y2: 7,  fill: '#0066cc', label: 'Aktiv ausgenutzt',   labelFill: '#0066cc' },
  { x1: 0.1, x2: 1,   y1: 7, y2: 10, fill: '#c9190b', label: 'Kritisches Risiko',  labelFill: '#c9190b' },
]

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
    <div style={{
      background: 'var(--pf-t--global--background--color--primary--default, #1b1d21)',
      border: '1px solid var(--pf-t--global--border--color--default, #4f5255)',
      color: 'var(--pf-t--global--text--color--regular, #e8e8e8)',
      padding: '8px 12px',
      borderRadius: 4,
      fontSize: 12,
    }}>
      <strong>{d.cve_id}</strong>
      <div>CVSS: {d.cvss.toFixed(1)}</div>
      <div>EPSS: {(d.epss * 100).toFixed(1)}%</div>
    </div>
  )
}

export function EpssRiskMatrix({ data }: Props) {
  const bySeverity = data.reduce<Record<number, Point[]>>((acc, p) => {
    if (!acc[p.severity]) acc[p.severity] = []
    acc[p.severity].push(p)
    return acc
  }, {})

  // Axis / grid colors that adapt to dark mode via CSS vars
  const axisColor = 'var(--pf-t--global--text--color--subtle, #8a8d90)'
  const gridColor = 'var(--pf-t--global--border--color--default, #444548)'

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--pf-t--global--text--color--subtle, #8a8d90)', marginBottom: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(DOT_COLORS).map(([sev, color]) => (
          <span key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ color: 'var(--pf-t--global--text--color--regular, inherit)' }}>
              {['Unbekannt', 'Gering', 'Mittel', 'Hoch', 'Kritisch'][Number(sev)]}
            </span>
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            type="number"
            dataKey="epss"
            name="EPSS"
            domain={[0, 1]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: axisColor, fontSize: 11 }}
            label={{ value: 'EPSS', position: 'insideBottom', offset: -10, fontSize: 11, fill: axisColor }}
          />
          <YAxis
            type="number"
            dataKey="cvss"
            name="CVSS"
            domain={[0, 10]}
            tick={{ fill: axisColor, fontSize: 11 }}
            label={{ value: 'CVSS', angle: -90, position: 'insideLeft', fontSize: 11, fill: axisColor }}
          />
          <Tooltip content={<CustomTooltip />} />
          {ZONES.map(z => (
            <ReferenceArea
              key={z.label}
              x1={z.x1} x2={z.x2} y1={z.y1} y2={z.y2}
              fill={z.fill}
              fillOpacity={0.12}
              label={{ value: z.label, fontSize: 9, fill: z.labelFill, position: 'insideTopLeft', fontWeight: 600 }}
            />
          ))}
          <ReferenceLine x={0.1} stroke="#ec7a08" strokeDasharray="4 4" label={{ value: 'EPSS 10%', fontSize: 10, fill: '#ec7a08' }} />
          <ReferenceLine y={7}   stroke="#c9190b" strokeDasharray="4 4" label={{ value: 'CVSS 7',   fontSize: 10, fill: '#c9190b' }} />
          {Object.entries(bySeverity).map(([sev, points]) => (
            <Scatter
              key={sev}
              data={points}
              fill={DOT_COLORS[Number(sev)] ?? '#8a8d90'}
              fillOpacity={0.85}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
