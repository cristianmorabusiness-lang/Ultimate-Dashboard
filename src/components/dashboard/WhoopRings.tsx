'use client'

import type { WhoopDaily } from '@/lib/database.types'

interface Props {
  whoop: WhoopDaily | null
}

function Ring({
  value,
  max = 100,
  label,
  color,
  unit = '%',
}: {
  value: number | null
  max?: number
  label: string
  color: string
  unit?: string
}) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = value !== null ? Math.min(value / max, 1) : 0
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#262626" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="text-center -mt-1">
        <p className="text-lg font-semibold text-white">
          {value !== null ? `${Math.round(value)}` : '—'}
          <span className="text-xs text-neutral-500 ml-0.5">{unit}</span>
        </p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function recoveryColor(score: number | null): string {
  if (score === null) return '#525252'
  if (score >= 67) return '#10b981'
  if (score >= 34) return '#f59e0b'
  return '#ef4444'
}

export function WhoopRings({ whoop }: Props) {
  if (!whoop) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-neutral-500 text-sm">No WHOOP data today. Sync will run at 02:00 UTC.</p>
      </div>
    )
  }

  const sleepH = whoop.sleep_duration_min
    ? Math.round((whoop.sleep_duration_min / 60) * 10) / 10
    : null

  return (
    <div className="space-y-4">
      <div className="flex justify-around">
        <Ring value={whoop.recovery_score} label="Recovery" color={recoveryColor(whoop.recovery_score)} />
        <Ring value={whoop.sleep_performance} label="Sleep" color="#6366f1" />
        <Ring
          value={whoop.day_strain}
          max={21}
          label="Strain"
          color="#f97316"
          unit=""
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-500">
        <div>
          <span className="text-neutral-300 font-medium">{whoop.hrv_rmssd_ms?.toFixed(1) ?? '—'}</span>
          <span className="ml-1">ms HRV</span>
        </div>
        <div>
          <span className="text-neutral-300 font-medium">{whoop.resting_hr_bpm ?? '—'}</span>
          <span className="ml-1">bpm RHR</span>
        </div>
        <div>
          <span className="text-neutral-300 font-medium">{sleepH ?? '—'}</span>
          <span className="ml-1">h sleep</span>
        </div>
      </div>
    </div>
  )
}
