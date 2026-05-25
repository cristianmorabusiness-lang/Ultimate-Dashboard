'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'

interface DayData {
  date: string; performance: number | null; durationH: number | null
  efficiency: number | null; consistency: number | null
  remH: number | null; deepH: number | null; lightH: number | null; awakeH: number | null
}

const TT = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px',
  fontSize: '11px',
  color: 'var(--text)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}
const LEGEND = { fontSize: '11px', color: 'var(--text-muted)', paddingTop: '8px' }

export function SleepCharts({ data }: { data: DayData[] }) {
  const fmt = data.map((d) => ({ ...d, date: d.date.slice(5) }))
  const hasStages = data.some((d) => d.remH !== null || d.deepH !== null)

  return (
    <div className="space-y-4">
      {/* Duration + Performance */}
      <div className="card p-5">
        <p className="section-label mb-4">Durata & Performance</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={fmt} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis yAxisId="h" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={28}
              tickFormatter={(v) => `${v}h`} />
            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
              axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={LEGEND} />
            <Line yAxisId="h" type="monotone" dataKey="durationH" name="Durata (h)" stroke="var(--sleep-deep)" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="pct" type="monotone" dataKey="performance" name="Performance %" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Efficiency + Consistency */}
      <div className="card p-5">
        <p className="section-label mb-4">Efficienza & Consistenza</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={fmt} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={LEGEND} />
            <Line type="monotone" dataKey="efficiency" name="Efficienza %" stroke="var(--info)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="consistency" name="Consistenza %" stroke="var(--sleep-light)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sleep stages stacked bar */}
      {hasStages && (
        <div className="card p-5">
          <p className="section-label mb-4">Fasi del Sonno</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={fmt} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={6}>
              <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={28}
                tickFormatter={(v) => `${v}h`} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={LEGEND} />
              <Bar dataKey="remH" name="REM" stackId="a" fill="var(--sleep-rem)" />
              <Bar dataKey="deepH" name="Profondo" stackId="a" fill="var(--sleep-deep)" />
              <Bar dataKey="lightH" name="Leggero" stackId="a" fill="var(--sleep-light)" />
              <Bar dataKey="awakeH" name="Sveglio" stackId="a" fill="var(--sleep-awake)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
