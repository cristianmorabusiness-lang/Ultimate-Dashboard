'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface WeightPoint {
  logged_date: string
  weight_kg: number
}

interface Props {
  data: WeightPoint[]
}

export function WeightSparkline({ data }: Props) {
  const formatted = data.map((d) => ({
    date: d.logged_date.slice(5),
    weight: d.weight_kg,
  }))

  const min = Math.min(...data.map((d) => d.weight_kg)) - 0.5
  const max = Math.max(...data.map((d) => d.weight_kg)) + 0.5

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min, max]}
          tick={{ fill: '#737373', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={(v) => `${v}kg`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#171717',
            border: '1px solid #404040',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#e5e5e5',
          }}
          formatter={(value: number) => [`${value} kg`, 'Weight']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#34d399' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
