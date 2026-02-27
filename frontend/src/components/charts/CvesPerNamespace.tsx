import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { namespace: string; count: number }[]
}

export function CvesPerNamespace({ data }: Props) {
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
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="namespace" width={120} tick={{ fontSize: 10 }} interval={0} />
        <Tooltip />
        <Bar dataKey="count" name="CVEs" fill="#0066cc" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
