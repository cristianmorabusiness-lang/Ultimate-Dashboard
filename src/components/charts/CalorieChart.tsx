'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface Props {
  data: { date: string; kcal: number }[]
  tdee: number
}

const TOOLTIP = {
  backgroundColor: '#0e0e1f',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px',
  fontSize: '11px',
  color: '#ede9fe',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export function CalorieChart({ data, tdee }: Props) {
  const formatted = data.map((d) => ({ date: d.date.slice(5), kcal: Math.round(d.kcal) }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(v: number) => [`${v} kcal`, 'Calorie']}
        />
        <ReferenceLine y={tdee} stroke="rgba(251,191,36,0.5)" strokeDasharray="4 4"
          label={{ value: 'TDEE', fill: '#fbbf24', fontSize: 10, position: 'insideTopRight' }} />
        <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.kcal > tdee ? 'rgba(251,146,60,0.75)' : 'rgba(139,92,246,0.65)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
