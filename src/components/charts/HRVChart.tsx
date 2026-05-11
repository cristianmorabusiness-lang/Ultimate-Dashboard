'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WhoopPoint {
  cycle_date: string
  hrv_rmssd_ms: number | null
  recovery_score: number | null
  sleep_performance: number | null
  day_strain: number | null
}

interface Props { data: WhoopPoint[] }

const TOOLTIP = {
  backgroundColor: '#0e0e1f',
  border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px',
  fontSize: '11px',
  color: '#ede9fe',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export function HRVChart({ data }: Props) {
  const formatted = data.map((d) => ({
    date: d.cycle_date.slice(5),
    hrv: d.hrv_rmssd_ms != null ? Math.round(d.hrv_rmssd_ms * 10) / 10 : null,
    recovery: d.recovery_score,
    sleep: d.sleep_performance,
    strain: d.day_strain,
  }))

  return (
    <div className="space-y-6">
      {/* HRV + Recovery */}
      <div>
        <p className="section-label mb-3">HRV & Recovery</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis yAxisId="left" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#8b7faa', paddingTop: '8px' }} />
            <Line yAxisId="left" type="monotone" dataKey="hrv" name="HRV (ms)" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="recovery" name="Recovery %" stroke="#4ade80" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep + Strain */}
      <div>
        <p className="section-label mb-3">Sonno & Strain</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 21]} tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={34} />
            <Tooltip contentStyle={TOOLTIP} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#8b7faa', paddingTop: '8px' }} />
            <Line yAxisId="left" type="monotone" dataKey="sleep" name="Sleep %" stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="strain" name="Strain (0-21)" stroke="#fb923c" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
