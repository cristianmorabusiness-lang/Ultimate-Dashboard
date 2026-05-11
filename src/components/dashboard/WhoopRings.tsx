'use client'

import type { WhoopDaily } from '@/lib/database.types'

interface Props { whoop: WhoopDaily | null }

// ── Ring ─────────────────────────────────────────────────────────────────────

function Ring({ value, max = 100, label, color, unit = '%' }: {
  value: number | null; max?: number; label: string
  color: string; unit?: string
}) {
  const r = 34
  const circ = 2 * Math.PI * r
  const pct = value !== null ? Math.min(value / max, 1) : 0
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth="6.5" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6.5"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 5px ${color}99)` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-sm font-medium leading-none" style={{ color }}>
            {value !== null ? Math.round(value) : '—'}
            <span className="text-[9px] ml-0.5" style={{ color: '#5e5479' }}>{unit}</span>
          </p>
        </div>
      </div>
      <p className="text-[11px] tracking-wide" style={{ color: '#8b7faa' }}>{label}</p>
    </div>
  )
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────

function Chip({ label, value, unit, color = '#c4b5fd' }: {
  label: string; value: string | number | null; unit?: string; color?: string
}) {
  return (
    <div className="stat-chip">
      <p className="font-mono text-sm font-medium" style={{ color }}>
        {value ?? '—'}{unit && value !== null && <span className="text-[10px] ml-0.5" style={{ color: '#5e5479' }}>{unit}</span>}
      </p>
      <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: '#8b7faa' }}>{label}</p>
    </div>
  )
}

// ── Sleep Stage Bar ───────────────────────────────────────────────────────────

function SleepStages({ rem, deep, light, awake }: {
  rem: number; deep: number; light: number; awake: number
}) {
  const total = rem + deep + light + awake
  if (total === 0) return null
  const pct = (v: number) => Math.round((v / total) * 100)

  const stages = [
    { label: 'REM', pct: pct(rem), color: '#8b5cf6' },
    { label: 'Profondo', pct: pct(deep), color: '#4f46e5' },
    { label: 'Leggero', pct: pct(light), color: '#7c3aed' },
    { label: 'Sveglio', pct: pct(awake), color: '#374151' },
  ]

  return (
    <div className="space-y-2">
      <p className="section-label">Fasi del sonno</p>
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {stages.map((s) => s.pct > 0 && (
          <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }}
            title={`${s.label}: ${s.pct}%`} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {stages.map((s) => (
          <div key={s.label} className="text-center">
            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: s.color }} />
            <p className="text-[10px]" style={{ color: '#8b7faa' }}>{s.label}</p>
            <p className="font-mono text-[11px] font-medium" style={{ color: '#b8add2' }}>{s.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function recoveryColor(score: number | null) {
  if (score === null) return '#5e5479'
  if (score >= 67) return '#a78bfa'
  if (score >= 34) return '#facc15'
  return '#f87171'
}

// ── Safe raw_json extraction ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRaw(whoop: WhoopDaily) {
  const raw = whoop.raw_json as Record<string, any> | null
  if (!raw) return {}

  const rec = raw.recovery?.score ?? {}
  const slp = raw.sleep?.score ?? {}
  const stg = slp.stage_summary ?? {}
  const cyc = raw.cycle?.score ?? {}

  const toMin = (ms: number | undefined) => ms ? Math.round(ms / 60000) : null
  const toH   = (ms: number | undefined) => ms ? Math.round((ms / 3600000) * 10) / 10 : null

  return {
    spo2:         rec.spo2_percentage         ? Math.round(rec.spo2_percentage * 10) / 10 : null,
    skinTemp:     rec.skin_temp_celsius        ? Math.round(rec.skin_temp_celsius * 10) / 10 : null,
    respiratory:  slp.respiratory_rate         ? Math.round(slp.respiratory_rate * 10) / 10 : null,
    efficiency:   slp.sleep_efficiency_percentage ? Math.round(slp.sleep_efficiency_percentage) : null,
    consistency:  slp.sleep_consistency_percentage ? Math.round(slp.sleep_consistency_percentage) : null,
    avgHR:        cyc.average_heart_rate       ? Math.round(cyc.average_heart_rate) : null,
    maxHR:        cyc.max_heart_rate           ? Math.round(cyc.max_heart_rate) : null,
    remMin:       toMin(stg.total_rem_sleep_duration_milli ?? stg.total_rem_sleep_time_milli),
    deepMin:      toMin(stg.total_slow_wave_sleep_duration_milli ?? stg.total_slow_wave_sleep_time_milli),
    lightMin:     toMin(stg.total_light_sleep_duration_milli ?? stg.total_light_sleep_time_milli),
    awakeMin:     toMin(stg.total_awake_duration_milli ?? stg.total_awake_time_milli),
    sleepCycles:  stg.sleep_cycle_count        ?? null,
    remH:         toH(stg.total_rem_sleep_duration_milli ?? stg.total_rem_sleep_time_milli),
    deepH:        toH(stg.total_slow_wave_sleep_duration_milli ?? stg.total_slow_wave_sleep_time_milli),
    lightH:       toH(stg.total_light_sleep_duration_milli ?? stg.total_light_sleep_time_milli),
    awakeH:       toH(stg.total_awake_duration_milli ?? stg.total_awake_time_milli),
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WhoopRings({ whoop }: Props) {
  if (!whoop) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm" style={{ color: '#8b7faa' }}>Nessun dato WHOOP oggi. Sync alle 02:00 UTC.</p>
      </div>
    )
  }

  const extra = extractRaw(whoop)
  const sleepH = whoop.sleep_duration_min
    ? Math.round((whoop.sleep_duration_min / 60) * 10) / 10 : null

  const hasStages = (extra.remMin ?? 0) + (extra.deepMin ?? 0) + (extra.lightMin ?? 0) > 0

  return (
    <div className="space-y-5">
      {/* 3 main rings */}
      <div className="flex justify-around">
        <Ring value={whoop.recovery_score} label="Recovery" color={recoveryColor(whoop.recovery_score)} />
        <Ring value={whoop.sleep_performance} label="Sleep" color="#a78bfa" />
        <Ring value={whoop.day_strain} max={21} label="Strain" color="#fb923c" unit="" />
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-4 gap-2">
        <Chip label="HRV" value={whoop.hrv_rmssd_ms?.toFixed(1) ?? null} unit="ms" color="#c4b5fd" />
        <Chip label="RHR" value={whoop.resting_hr_bpm} unit="bpm" color="#93c5fd" />
        <Chip label="Sonno" value={sleepH} unit="h" color="#a78bfa" />
        <Chip label="Calorie" value={whoop.energy_burnt_kcal} unit="kcal" color="#fb923c" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-4 gap-2">
        {extra.spo2 != null && <Chip label="SpO2" value={extra.spo2} unit="%" color="#6ee7b7" />}
        {extra.skinTemp != null && <Chip label="Temp Cute" value={extra.skinTemp} unit="°C" color="#fca5a5" />}
        {extra.respiratory != null && <Chip label="Respiraz." value={extra.respiratory} unit="/min" color="#93c5fd" />}
        {whoop.sleep_disturbances != null && <Chip label="Disturbi" value={whoop.sleep_disturbances} color="#fdba74" />}
        {extra.efficiency != null && <Chip label="Efficienza" value={extra.efficiency} unit="%" color="#a78bfa" />}
        {extra.consistency != null && <Chip label="Consist." value={extra.consistency} unit="%" color="#c4b5fd" />}
        {extra.avgHR != null && <Chip label="HR Media" value={extra.avgHR} unit="bpm" color="#fb7185" />}
        {extra.maxHR != null && <Chip label="HR Max" value={extra.maxHR} unit="bpm" color="#f43f5e" />}
        {extra.sleepCycles != null && <Chip label="Cicli Sonno" value={extra.sleepCycles} color="#a78bfa" />}
      </div>

      {/* Sleep stages */}
      {hasStages && (
        <SleepStages
          rem={extra.remMin ?? 0}
          deep={extra.deepMin ?? 0}
          light={extra.lightMin ?? 0}
          awake={extra.awakeMin ?? 0}
        />
      )}
    </div>
  )
}
