'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface WeightPoint { logged_date: string; weight_kg: number }
interface Props { data: WeightPoint[] }

export function WeightTrendChart({ data }: Props) {
  const formatted = data.map((d) => ({ date: d.logged_date.slice(5), weight: d.weight_kg }))
  const avg = data.reduce((a, b) => a + b.weight_kg, 0) / data.length
  const min = Math.min(...data.map((d) => d.weight_kg)) - 1
  const max = Math.max(...data.map((d) => d.weight_kg)) + 1

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
        <YAxis domain={[min, max]} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `${v}kg`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', fontSize: '12px', color: '#e5e5e5' }}
          formatter={(v: number) => [`${v} kg`, 'Weight']}
        />
        <ReferenceLine y={avg} stroke="#525252" strokeDasharray="4 4" label={{ value: `avg ${avg.toFixed(1)}kg`, fill: '#737373', fontSize: 11 }} />
        <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
