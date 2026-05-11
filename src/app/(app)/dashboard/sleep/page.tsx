import { createClient } from '@/lib/supabase/server'
import { daysAgo } from '@/lib/date'
import { SleepCharts } from '@/components/dashboard/SleepCharts'
import type { WhoopDaily } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const thirtyAgo = daysAgo(30)

  const { data: raw } = await supabase
    .from('whoop_daily')
    .select('cycle_date, sleep_performance, sleep_duration_min, sleep_disturbances, raw_json')
    .eq('user_id', user.id)
    .gte('cycle_date', thirtyAgo)
    .order('cycle_date', { ascending: true })

  const whoop = (raw ?? []) as Pick<WhoopDaily, 'cycle_date' | 'sleep_performance' | 'sleep_duration_min' | 'sleep_disturbances' | 'raw_json'>[]

  // Extract enriched sleep stats from raw_json
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = whoop.map((w) => {
    const r = w.raw_json as Record<string, any> | null
    const slp = r?.sleep?.score ?? {}
    const stg = slp.stage_summary ?? {}
    const toH = (ms: number | undefined) => ms ? Math.round((ms / 3600000) * 10) / 10 : null

    return {
      date: w.cycle_date,
      performance: w.sleep_performance,
      durationH: w.sleep_duration_min ? Math.round((w.sleep_duration_min / 60) * 10) / 10 : null,
      disturbances: w.sleep_disturbances,
      efficiency: slp.sleep_efficiency_percentage ? Math.round(slp.sleep_efficiency_percentage) : null,
      consistency: slp.sleep_consistency_percentage ? Math.round(slp.sleep_consistency_percentage) : null,
      respiratory: slp.respiratory_rate ? Math.round(slp.respiratory_rate * 10) / 10 : null,
      remH: toH(stg.total_rem_sleep_duration_milli ?? stg.total_rem_sleep_time_milli),
      deepH: toH(stg.total_slow_wave_sleep_duration_milli ?? stg.total_slow_wave_sleep_time_milli),
      lightH: toH(stg.total_light_sleep_duration_milli ?? stg.total_light_sleep_time_milli),
      awakeH: toH(stg.total_awake_duration_milli ?? stg.total_awake_time_milli),
    }
  })

  // Compute 30-day averages
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => v !== null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
  }

  const stats = {
    duration: avg(data.map((d) => d.durationH)),
    performance: avg(data.map((d) => d.performance)),
    efficiency: avg(data.map((d) => d.efficiency)),
    consistency: avg(data.map((d) => d.consistency)),
    respiratory: avg(data.map((d) => d.respiratory)),
    rem: avg(data.map((d) => d.remH)),
    deep: avg(data.map((d) => d.deepH)),
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>
          Analisi Sonno
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Ultimi 30 giorni — dati WHOOP</p>
      </div>

      {data.length === 0 ? (
        <div className="card p-16 text-center">
          <p style={{ color: '#8b7faa' }}>Nessun dato WHOOP disponibile.</p>
        </div>
      ) : (
        <>
          {/* Stats chips */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { label: 'Durata', value: stats.duration, unit: 'h', color: '#a78bfa' },
              { label: 'Perf.', value: stats.performance, unit: '%', color: '#8b5cf6' },
              { label: 'Efficienza', value: stats.efficiency, unit: '%', color: '#7c3aed' },
              { label: 'Consistenza', value: stats.consistency, unit: '%', color: '#6d28d9' },
              { label: 'Resp.', value: stats.respiratory, unit: '/m', color: '#93c5fd' },
              { label: 'REM', value: stats.rem, unit: 'h', color: '#c4b5fd' },
              { label: 'Profondo', value: stats.deep, unit: 'h', color: '#4f46e5' },
            ].map((s) => (
              <div key={s.label} className="stat-chip text-center">
                <p className="font-mono text-sm font-semibold" style={{ color: s.color }}>
                  {s.value ?? '—'}
                  {s.value !== null && <span className="text-[10px] ml-0.5" style={{ color: '#5e5479' }}>{s.unit}</span>}
                </p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: '#8b7faa' }}>{s.label}</p>
                <p className="text-[9px] mt-0.5" style={{ color: '#4a4268' }}>avg 30gg</p>
              </div>
            ))}
          </div>

          <SleepCharts data={data} />
        </>
      )}
    </div>
  )
}
