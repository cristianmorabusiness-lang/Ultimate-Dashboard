'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface WeightPoint { logged_date: string; weight_kg: number }
interface Props { data: WeightPoint[] }

const TOOLTIP_STYLE = {
  backgroundColor: '#0e0e1f',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#ede9fe',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export function WeightSparkline({ data }: Props) {
  const formatted = data.map((d) => ({ date: d.logged_date.slice(5), weight: d.weight_kg }))
  const vals = data.map((d) => d.weight_kg)
  const min = Math.min(...vals) - 0.5
  const max = Math.max(...vals) + 0.5
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className="font-mono text-xl font-medium" style={{ color: '#c4b5fd' }}>
            {vals[vals.length - 1]} <span className="text-xs" style={{ color: '#8b7faa' }}>kg</span>
          </p>
          <p className="text-[11px]" style={{ color: '#8b7faa' }}>Ultima rilevazione</p>
        </div>
        <div>
          <p className="font-mono text-base" style={{ color: '#b8add2' }}>
            {avg} <span className="text-xs" style={{ color: '#8b7faa' }}>kg</span>
          </p>
          <p className="text-[11px]" style={{ color: '#8b7faa' }}>Media 14gg</p>
        </div>
        <div>
          <p className="font-mono text-base" style={{ color: (vals[vals.length - 1] - vals[0]) < 0 ? '#4ade80' : '#fb923c' }}>
            {((vals[vals.length - 1] - vals[0]) >= 0 ? '+' : '')}{Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10} kg
          </p>
          <p className="text-[11px]" style={{ color: '#8b7faa' }}>Variazione</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[min, max]} tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={38} tickFormatter={(v) => `${v}`} />
          <ReferenceLine y={avg} stroke="rgba(139,92,246,0.3)" strokeDasharray="4 3" />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} kg`, 'Peso']} labelFormatter={(l) => `Data: ${l}`} />
          <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#c4b5fd', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
