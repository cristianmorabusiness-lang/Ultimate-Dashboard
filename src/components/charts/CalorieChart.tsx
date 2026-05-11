'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface Props {
  data: { date: string; kcal: number }[]
  tdee: number
}

export function CalorieChart({ data, tdee }: Props) {
  const formatted = data.map((d) => ({ date: d.date.slice(5), kcal: Math.round(d.kcal) }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', fontSize: '12px', color: '#e5e5e5' }}
          formatter={(v: number) => [`${v} kcal`, 'Calories']}
        />
        <ReferenceLine y={tdee} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'TDEE', fill: '#f59e0b', fontSize: 11 }} />
        <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.kcal > tdee ? '#f97316' : '#10b981'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
