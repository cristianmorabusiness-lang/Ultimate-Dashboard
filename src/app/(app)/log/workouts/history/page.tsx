'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface WorkoutSet {
  id: string; exercise_name: string; set_number: number
  reps: number | null; weight_kg: number | null; rpe: number | null
}
interface WorkoutEntry {
  id: string; logged_date: string; workout_type: string
  title: string | null; sets: WorkoutSet[]; volume_kg: number
}
interface Progression { date: string; maxWeight: number; bestReps: number; volume: number; sets: number }
interface PR { weight_kg: number | null; reps: number | null; date: string | undefined }
interface CoachData { suggested_weight: number | null; suggested_reps: string; rationale: string; progression_note: string }

const TOOLTIP = {
  backgroundColor: '#0e0e1f', border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px', fontSize: '11px', color: '#ede9fe', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

export default function WorkoutHistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedEx, setSelectedEx] = useState('')
  const [progression, setProgression] = useState<Progression[]>([])
  const [pr, setPr] = useState<PR | null>(null)
  const [coach, setCoach] = useState<CoachData | null>(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/workouts/history?limit=60').then((r) => r.json()),
      fetch('/api/workouts/exercise').then((r) => r.json()),
    ]).then(([h, e]) => {
      if (h.workouts) setWorkouts(h.workouts)
      if (e.exercises) setExercises(e.exercises)
      setLoading(false)
    })
  }, [])

  const loadProgression = useCallback(async (ex: string) => {
    if (!ex) { setProgression([]); setPr(null); setCoach(null); return }
    const res = await fetch(`/api/workouts/exercise?name=${encodeURIComponent(ex)}`)
    const data = await res.json()
    setProgression(data.progression ?? [])
    setPr(data.pr ?? null)
  }, [])

  useEffect(() => { loadProgression(selectedEx) }, [selectedEx, loadProgression])

  async function getCoach() {
    if (!selectedEx) return
    setCoachLoading(true)
    setCoach(null)
    try {
      const res = await fetch('/api/ai/workout-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: selectedEx }),
      })
      const data = await res.json()
      if (data.coach) setCoach(data.coach)
    } finally { setCoachLoading(false) }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const WORKOUT_LABELS: Record<string, string> = {
    strength: 'Forza', cardio: 'Cardio', hiit: 'HIIT',
    mobility: 'Mobilità', torso_limbs_4x: 'Torso Limbs 4×',
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>
          Storico Workout
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Progressione esercizi e analisi</p>
      </div>

      {/* Exercise progression section */}
      <div className="card p-5 space-y-4">
        <p className="section-label">Analisi Esercizio</p>

        <select
          value={selectedEx}
          onChange={(e) => setSelectedEx(e.target.value)}
          className="inp"
        >
          <option value="">— Seleziona un esercizio —</option>
          {exercises.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
        </select>

        {selectedEx && pr && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#a78bfa' }}>
                Personal Record
              </p>
              <p className="font-mono text-base font-bold" style={{ color: '#ede9fe' }}>
                {pr.weight_kg}kg × {pr.reps} reps
                <span className="text-xs font-normal ml-2" style={{ color: '#8b7faa' }}>
                  {pr.date}
                </span>
              </p>
            </div>
          </div>
        )}

        {selectedEx && progression.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: '#8b7faa' }}>
              Carico massimo per sessione
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={progression.map((p) => ({ ...p, date: p.date.slice(5) }))}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={36}
                  tickFormatter={(v) => `${v}kg`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}kg`, 'Max peso']} />
                {pr?.weight_kg && (
                  <ReferenceLine y={pr.weight_kg} stroke="rgba(139,92,246,0.4)" strokeDasharray="4 3" />
                )}
                <Line type="monotone" dataKey="maxWeight" stroke="#8b5cf6" strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#c4b5fd', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedEx && progression.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: '#8b7faa' }}>Volume per sessione (kg totali)</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={progression.map((p) => ({ ...p, date: p.date.slice(5) }))}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={44}
                  tickFormatter={(v) => `${v}`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}kg`, 'Volume']} />
                <Line type="monotone" dataKey="volume" stroke="#fb923c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Coach */}
        {selectedEx && progression.length >= 2 && (
          <div>
            <button onClick={getCoach} disabled={coachLoading} className="btn-ghost w-full">
              {coachLoading ? 'Analisi in corso...' : '🤖 Coaching AI per oggi'}
            </button>
            {coach && (
              <div className="mt-3 rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
                {coach.suggested_weight && (
                  <p className="font-mono text-lg font-bold" style={{ color: '#c4b5fd' }}>
                    {coach.suggested_weight}kg · {coach.suggested_reps}
                  </p>
                )}
                <p className="text-sm" style={{ color: '#b8add2' }}>{coach.rationale}</p>
                <p className="text-xs italic" style={{ color: '#8b7faa' }}>{coach.progression_note}</p>
              </div>
            )}
          </div>
        )}

        {selectedEx && progression.length === 0 && (
          <p className="text-sm" style={{ color: '#8b7faa' }}>
            Nessun dato trovato per questo esercizio.
          </p>
        )}
      </div>

      {/* Workout log list */}
      <div className="space-y-3">
        <p className="section-label">Sessioni Recenti ({workouts.length})</p>
        {loading && <p className="text-sm" style={{ color: '#8b7faa' }}>Caricamento...</p>}

        {!loading && workouts.length === 0 && (
          <div className="card p-10 text-center">
            <p style={{ color: '#8b7faa' }}>Nessun workout ancora.</p>
          </div>
        )}

        {workouts.map((w) => {
          const open = expanded.has(w.id)
          const exNames = [...new Set(w.sets.map((s) => s.exercise_name))]
          return (
            <div key={w.id} className="card overflow-hidden">
              <button
                onClick={() => toggleExpand(w.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>
                        {w.title ?? WORKOUT_LABELS[w.workout_type] ?? w.workout_type}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                        {w.workout_type}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: '#5e5479' }}>{w.logged_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {w.volume_kg > 0 && (
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold" style={{ color: '#fb923c' }}>
                        {w.volume_kg.toLocaleString()}
                        <span className="text-[10px] ml-0.5" style={{ color: '#5e5479' }}>kg</span>
                      </p>
                      <p className="text-[10px]" style={{ color: '#5e5479' }}>volume</p>
                    </div>
                  )}
                  <span style={{ color: '#5e5479', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Exercise chips (always visible) */}
              {exNames.length > 0 && !open && (
                <div className="px-4 pb-3 flex flex-wrap gap-1">
                  {exNames.slice(0, 5).map((ex) => (
                    <span key={ex} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: '#8b7faa' }}>
                      {ex}
                    </span>
                  ))}
                  {exNames.length > 5 && (
                    <span className="text-[10px]" style={{ color: '#5e5479' }}>+{exNames.length - 5}</span>
                  )}
                </div>
              )}

              {/* Sets table */}
              {open && w.sets.length > 0 && (
                <div className="overflow-x-auto" style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                  <table className="w-full text-sm min-w-[340px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
                        {['Esercizio', 'S', 'Reps', 'kg', 'RPE'].map((h, i) => (
                          <th key={h} className={`py-2 text-[10px] uppercase tracking-wide font-semibold ${i === 0 ? 'text-left px-4' : 'text-right px-2'}`}
                            style={{ color: '#4a4268' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {w.sets.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(139,92,246,0.05)' }}>
                          <td className="py-2 px-4 text-sm" style={{ color: '#c4b5fd' }}>{s.exercise_name}</td>
                          <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: '#5e5479' }}>{s.set_number}</td>
                          <td className="py-2 px-2 text-right font-mono text-sm font-semibold" style={{ color: '#ede9fe' }}>{s.reps ?? '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-sm font-semibold" style={{ color: '#ede9fe' }}>{s.weight_kg ?? '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: '#8b7faa' }}>{s.rpe ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {open && w.sets.length === 0 && (
                <p className="px-4 pb-3 text-xs" style={{ color: '#5e5479' }}>Nessuna serie loggata.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
