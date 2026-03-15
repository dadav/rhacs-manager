import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { namespace: string; count: number }[]
  onBarClick?: (namespace: string) => void
}

interface TooltipPayload {
  payload: { namespace: string; count: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d2d2d2',
      color: '#151515',
      padding: '8px 12px',
      borderRadius: 4,
      fontSize: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      <strong>{d.namespace}</strong>
      <div>CVEs: {d.count}</div>
    </div>
  )
}

export function CvesPerNamespace({ data, onBarClick }: Props) {
  const portalRef = useRef<HTMLDivElement>(null)
  const [portalEl, setPortalEl] = useState<HTMLElement | undefined>()
  useEffect(() => { setPortalEl(portalRef.current ?? undefined) }, [])
  const top = data.slice(0, 10)

  if (!top.length) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73', fontSize: 13 }}>
        Keine Daten verfügbar
      </div>
    )
  }

  const height = Math.max(220, top.length * 28)

  return (
    <div style={{ position: 'relative' }}>
      <div ref={portalRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10, pointerEvents: 'none' }} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={top} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="namespace" width={120} tick={{ fontSize: 10 }} interval={0} />
          <Tooltip
            content={<CustomTooltip />}
            portal={portalEl}
          />
          <Bar
            dataKey="count"
            name="CVEs"
            fill="#0066cc"
            radius={[0, 2, 2, 0]}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
            onClick={onBarClick ? (entry) => {
              onBarClick((entry as unknown as { namespace: string }).namespace)
            } : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
