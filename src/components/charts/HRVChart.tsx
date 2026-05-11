'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WhoopPoint {
  cycle_date: string
  hrv_rmssd_ms: number | null
  recovery_score: number | null
}

interface Props { data: WhoopPoint[] }

const tooltipStyle = {
  backgroundColor: '#171717',
  border: '1px solid #404040',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e5e5e5',
}

export function HRVChart({ data }: Props) {
  const formatted = data.map((d) => ({
    date: d.cycle_date.slice(5),
    hrv: d.hrv_rmssd_ms != null ? Math.round(d.hrv_rmssd_ms * 10) / 10 : null,
    recovery: d.recovery_score,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
        <YAxis yAxisId="left" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#a3a3a3' }} />
        <Line yAxisId="left" type="monotone" dataKey="hrv" name="HRV (ms)" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
        <Line yAxisId="right" type="monotone" dataKey="recovery" name="Recovery %" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
