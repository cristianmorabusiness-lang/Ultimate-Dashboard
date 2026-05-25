'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface WeightPoint { logged_date: string; weight_kg: number }
interface Props { data: WeightPoint[] }

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--text)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export function WeightSparkline({ data }: Props) {
  const formatted = data.map((d) => ({ date: d.logged_date.slice(5), weight: d.weight_kg }))
  const vals = data.map((d) => d.weight_kg)
  const min = Math.min(...vals) - 0.5
  const max = Math.max(...vals) + 0.5
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  const delta = Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10
  const deltaColor = delta < 0 ? 'var(--success)' : delta > 0 ? 'var(--warning)' : 'var(--text-muted)'

  return (
    <div>
      <div className="flex items-center gap-4 md:gap-6 mb-3 flex-wrap">
        <div>
          <p className="font-mono text-xl font-medium" style={{ color: 'var(--text)' }}>
            {vals[vals.length - 1]} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</span>
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Ultima rilevazione</p>
        </div>
        <div>
          <p className="font-mono text-base" style={{ color: 'var(--text-secondary)' }}>
            {avg} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</span>
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Media 14gg</p>
        </div>
        <div>
          <p className="font-mono text-base" style={{ color: deltaColor }}>
            {delta >= 0 ? '+' : ''}{delta} kg
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Variazione</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[min, max]} tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={38} tickFormatter={(v) => `${v}`} />
          <ReferenceLine y={avg} stroke="var(--chart-grid)" strokeDasharray="4 3" />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v} kg`, 'Peso']} labelFormatter={(l) => `Data: ${l}`} />
          <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: 'var(--accent-soft)', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
