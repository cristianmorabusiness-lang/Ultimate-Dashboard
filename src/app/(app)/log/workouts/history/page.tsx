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
interface ExCoachData { suggested_weight: number | null; suggested_reps: string; rationale: string; progression_note: string }
interface SessionExercise {
  exercise: string; last_best: string
  suggested_weight: number | null; suggested_reps: string; adjustment: string; note: string
}
interface SessionCoachData { session_note: string; exercises: SessionExercise[] }

const TOOLTIP = {
  backgroundColor: '#0e0e1f', border: '1px solid rgba(139,92,246,0.3)',
  borderRadius: '10px', fontSize: '11px', color: '#ede9fe', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const SESSION_TYPES = [
  { key: 'Torso A', label: 'Torso A', color: '#ef4444', dot: '#fca5a5' },
  { key: 'Limbs',   label: 'Limbs',   color: '#22c55e', dot: '#86efac' },
  { key: 'Torso B', label: 'Torso B', color: '#3b82f6', dot: '#93c5fd' },
  { key: 'Torso C', label: 'Torso C', color: '#a855f7', dot: '#d8b4fe' },
]

export default function WorkoutHistoryPage() {
  const [mode, setMode] = useState<'session' | 'exercise'>('session')

  // ── Session mode state ──
  const [selectedSession, setSelectedSession] = useState('')
  const [sessionCoach, setSessionCoach] = useState<SessionCoachData | null>(null)
  const [sessionDate, setSessionDate] = useState('')
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState('')

  // ── Exercise mode state ──
  const [exercises, setExercises] = useState<string[]>([])
  const [selectedEx, setSelectedEx] = useState('')
  const [progression, setProgression] = useState<Progression[]>([])
  const [pr, setPr] = useState<PR | null>(null)
  const [exCoach, setExCoach] = useState<ExCoachData | null>(null)
  const [exCoachLoading, setExCoachLoading] = useState(false)

  // ── History list state ──
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
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

  // ── Session coach ──
  async function getSessionCoach(session: string) {
    setSelectedSession(session)
    setSessionCoach(null)
    setSessionError('')
    setSessionLoading(true)
    try {
      const res = await fetch('/api/ai/session-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
      })
      const data = await res.json()
      if (data.coach) {
        setSessionCoach(data.coach)
        setSessionDate(data.last_date ?? '')
      } else {
        setSessionError(data.error ?? 'Errore sconosciuto')
      }
    } catch {
      setSessionError('Errore di connessione')
    } finally {
      setSessionLoading(false)
    }
  }

  // ── Exercise mode ──
  const loadProgression = useCallback(async (ex: string) => {
    if (!ex) { setProgression([]); setPr(null); setExCoach(null); return }
    const res = await fetch(`/api/workouts/exercise?name=${encodeURIComponent(ex)}`)
    const data = await res.json()
    setProgression(data.progression ?? [])
    setPr(data.pr ?? null)
    setExCoach(null)
  }, [])

  useEffect(() => { loadProgression(selectedEx) }, [selectedEx, loadProgression])

  async function getExCoach() {
    if (!selectedEx) return
    setExCoachLoading(true)
    setExCoach(null)
    try {
      const res = await fetch('/api/ai/workout-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: selectedEx }),
      })
      const data = await res.json()
      if (data.coach) setExCoach(data.coach)
    } finally { setExCoachLoading(false) }
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
        <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Analisi e progressione</p>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(109,40,217,0.15)' }}>
        {[
          { key: 'session', label: 'Per Sessione', icon: '📋' },
          { key: 'exercise', label: 'Per Esercizio', icon: '📈' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key as 'session' | 'exercise')}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
            style={mode === m.key ? {
              background: 'rgba(124,58,237,0.2)',
              color: '#d8b4fe',
              boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.4)',
            } : { color: '#6b5f8a' }}
          >
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          MODE: PER SESSIONE
      ════════════════════════════════════════════ */}
      {mode === 'session' && (
        <div className="card p-5 space-y-5">
          <div>
            <p className="section-label mb-1">Analisi Sessione Completa</p>
            <p className="text-xs" style={{ color: '#6b5f8a' }}>
              Seleziona una giornata — l&apos;AI analizza l&apos;ultima sessione e ti dice cosa aggiustare
            </p>
          </div>

          {/* Session type buttons */}
          <div className="grid grid-cols-2 gap-2">
            {SESSION_TYPES.map((s) => (
              <button
                key={s.key}
                onClick={() => getSessionCoach(s.key)}
                disabled={sessionLoading && selectedSession === s.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={selectedSession === s.key ? {
                  background: 'rgba(124,58,237,0.15)',
                  border: `1px solid ${s.color}55`,
                  color: '#ede9fe',
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(109,40,217,0.15)',
                  color: '#8b7faa',
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="font-semibold text-sm">{s.label}</span>
                {sessionLoading && selectedSession === s.key && (
                  <span className="ml-auto text-xs" style={{ color: '#6b5f8a' }}>analisi...</span>
                )}
              </button>
            ))}
          </div>

          {/* Error */}
          {sessionError && (
            <p className="text-sm text-center" style={{ color: '#f87171' }}>{sessionError}</p>
          )}

          {/* Session coach result */}
          {sessionCoach && !sessionLoading && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#a78bfa' }}>
                  Piano per la prossima {selectedSession}
                </p>
                {sessionDate && (
                  <p className="text-[10px] font-mono" style={{ color: '#4a4268' }}>
                    basato su {sessionDate}
                  </p>
                )}
              </div>

              {/* Session note */}
              <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-sm italic" style={{ color: '#b8add2' }}>{sessionCoach.session_note}</p>
              </div>

              {/* Per-exercise table */}
              <div className="space-y-2">
                {sessionCoach.exercises.map((ex, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(109,40,217,0.15)' }}>
                    {/* Exercise header */}
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: 'rgba(124,58,237,0.06)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>{ex.exercise}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                        {ex.adjustment}
                      </span>
                    </div>
                    {/* Details */}
                    <div className="px-4 py-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#4a4268' }}>Ultima sess.</p>
                        <p className="font-mono text-xs" style={{ color: '#8b7faa' }}>{ex.last_best}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#4a4268' }}>Prossima</p>
                        <p className="font-mono text-sm font-bold" style={{ color: '#c4b5fd' }}>
                          {ex.suggested_weight ? `${ex.suggested_weight}kg` : '—'}
                          <span className="text-xs font-normal ml-1" style={{ color: '#6b5f8a' }}>
                            × {ex.suggested_reps}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: '#4a4268' }}>Nota</p>
                        <p className="text-[11px] leading-snug" style={{ color: '#8b7faa' }}>{ex.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!sessionCoach && !sessionLoading && !sessionError && (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: '#4a4268' }}>Seleziona una sessione per analizzarla</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODE: PER ESERCIZIO
      ════════════════════════════════════════════ */}
      {mode === 'exercise' && (
        <div className="card p-5 space-y-4">
          <div>
            <p className="section-label mb-1">Analisi Esercizio</p>
            <p className="text-xs" style={{ color: '#6b5f8a' }}>Progressione dettagliata e coaching per un singolo esercizio</p>
          </div>

          <select value={selectedEx} onChange={(e) => setSelectedEx(e.target.value)} className="inp">
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
                  <span className="text-xs font-normal ml-2" style={{ color: '#8b7faa' }}>{pr.date}</span>
                </p>
              </div>
            </div>
          )}

          {selectedEx && progression.length > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: '#8b7faa' }}>Carico massimo per sessione</p>
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

              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: '#8b7faa' }}>Volume per sessione (kg totali)</p>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={progression.map((p) => ({ ...p, date: p.date.slice(5) }))}
                    margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#5e5479', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}kg`, 'Volume']} />
                    <Line type="monotone" dataKey="volume" stroke="#fb923c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <button onClick={getExCoach} disabled={exCoachLoading} className="btn-ghost w-full">
                  {exCoachLoading ? 'Analisi in corso...' : '🤖 Coaching AI per questo esercizio'}
                </button>
                {exCoach && (
                  <div className="mt-3 rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    {exCoach.suggested_weight && (
                      <p className="font-mono text-lg font-bold" style={{ color: '#c4b5fd' }}>
                        {exCoach.suggested_weight}kg · {exCoach.suggested_reps}
                      </p>
                    )}
                    <p className="text-sm" style={{ color: '#b8add2' }}>{exCoach.rationale}</p>
                    <p className="text-xs italic" style={{ color: '#8b7faa' }}>{exCoach.progression_note}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedEx && progression.length === 0 && (
            <p className="text-sm" style={{ color: '#8b7faa' }}>Nessun dato trovato per questo esercizio.</p>
          )}

          {!selectedEx && (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: '#4a4268' }}>Seleziona un esercizio per vedere la progressione</p>
            </div>
          )}
        </div>
      )}

      {/* ── Sessioni recenti (sempre visibili) ── */}
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
          const sessionColor = SESSION_TYPES.find((s) => s.key === w.title)?.color
          return (
            <div key={w.id} className="card overflow-hidden">
              <button
                onClick={() => toggleExpand(w.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {sessionColor && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sessionColor }} />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>
                        {w.title ?? WORKOUT_LABELS[w.workout_type] ?? w.workout_type}
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
