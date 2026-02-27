import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { namespace: string; count: number }[]
}

export function CvesPerNamespace({ data }: Props) {
  const top = data.slice(0, 10)
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="namespace" width={120} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" name="CVEs" fill="#0066cc" radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
