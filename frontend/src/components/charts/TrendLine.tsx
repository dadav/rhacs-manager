import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Props {
  data: { date: string; count: number }[]
}

export function TrendLine({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6a6e73', fontSize: 13 }}>
        Keine Daten verfügbar
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0066cc" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0066cc" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--pf-t--global--border--color--default, #d2d2d2)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'currentColor' }}
          tickFormatter={d => d.slice(5)}  // MM-DD
        />
        <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} />
        <Tooltip
          labelFormatter={l => `Datum: ${l}`}
          formatter={v => [v, 'CVEs']}
          contentStyle={{
            backgroundColor: 'var(--pf-v6-global--BackgroundColor--100, var(--pf-t--global--background--color--primary--default, #fff))',
            border: '1px solid var(--pf-t--global--border--color--default, #d2d2d2)',
            color: 'var(--pf-v6-global--Color--100, var(--pf-t--global--text--color--regular, #151515))',
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="CVEs"
          stroke="#0066cc"
          fill="url(#trendGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
