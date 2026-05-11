'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface WeightPoint { logged_date: string; weight_kg: number }
interface Props { data: WeightPoint[] }

const TOOLTIP = {
  backgroundColor: '#0e0e1f',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px',
  fontSize: '11px',
  color: '#ede9fe',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export function WeightTrendChart({ data }: Props) {
  const formatted = data.map((d) => ({ date: d.logged_date.slice(5), weight: d.weight_kg }))
  const avg = Math.round((data.reduce((a, b) => a + b.weight_kg, 0) / data.length) * 10) / 10
  const min = Math.min(...data.map((d) => d.weight_kg)) - 0.5
  const max = Math.max(...data.map((d) => d.weight_kg)) + 0.5

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
        <YAxis domain={[min, max]} tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={42}
          tickFormatter={(v) => `${v}kg`} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number) => [`${v} kg`, 'Peso']}
        />
        <ReferenceLine y={avg} stroke="rgba(139,92,246,0.3)" strokeDasharray="4 3"
          label={{ value: `med ${avg}kg`, fill: '#8b7faa', fontSize: 10, position: 'insideTopRight' }} />
        <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2}
          dot={{ fill: '#8b5cf6', r: 2.5, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#c4b5fd', strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
