'use client'

import type { WhoopDaily } from '@/lib/database.types'

interface Props {
  whoop: WhoopDaily | null
}

function Ring({ value, max = 100, label, color, trackColor = '#1a1030', unit = '%' }: {
  value: number | null
  max?: number
  label: string
  color: string
  trackColor?: string
  unit?: string
}) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = value !== null ? Math.min(value / max, 1) : 0
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke={trackColor} strokeWidth="7" />
          <circle
            cx="48" cy="48" r={r} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rotate-0">
          <div className="text-center">
            <p className="text-base font-mono font-medium" style={{ color: value !== null ? color : '#4a4268' }}>
              {value !== null ? Math.round(value) : '—'}
              <span className="text-[10px] ml-0.5" style={{ color: '#4a4268' }}>{unit}</span>
            </p>
          </div>
        </div>
      </div>
      <p className="text-[11px] tracking-wide" style={{ color: '#6b5f8a' }}>{label}</p>
    </div>
  )
}

function recoveryColor(score: number | null): string {
  if (score === null) return '#4a4268'
  if (score >= 67) return '#4ade80'
  if (score >= 34) return '#facc15'
  return '#f87171'
}

export function WhoopRings({ whoop }: Props) {
  if (!whoop) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm" style={{ color: '#4a4268' }}>Nessun dato WHOOP oggi. Sync alle 02:00 UTC.</p>
      </div>
    )
  }

  const sleepH = whoop.sleep_duration_min
    ? Math.round((whoop.sleep_duration_min / 60) * 10) / 10
    : null

  return (
    <div className="space-y-5">
      <div className="flex justify-around">
        <Ring value={whoop.recovery_score} label="Recovery" color={recoveryColor(whoop.recovery_score)} />
        <Ring value={whoop.sleep_performance} label="Sleep" color="#a78bfa" />
        <Ring value={whoop.day_strain} max={21} label="Strain" color="#fb923c" unit="" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'HRV', value: whoop.hrv_rmssd_ms?.toFixed(1) ?? '—', unit: 'ms' },
          { label: 'RHR', value: whoop.resting_hr_bpm ?? '—', unit: 'bpm' },
          { label: 'Sonno', value: sleepH ?? '—', unit: 'h' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl py-2 px-1"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(109,40,217,0.15)' }}>
            <p className="font-mono text-sm font-medium" style={{ color: '#d8b4fe' }}>
              {s.value}<span className="text-[10px] ml-0.5" style={{ color: '#4a4268' }}>{s.unit}</span>
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#4a4268' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
