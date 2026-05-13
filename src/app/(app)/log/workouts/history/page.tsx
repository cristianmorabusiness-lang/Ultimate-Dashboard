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
  { key: 'Torso A', label: 'Torso A', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  { key: 'Limbs',   label: 'Limbs',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { key: 'Torso B', label: 'Torso B', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { key: 'Torso C', label: 'Torso C', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
]

const DAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
}

export default function WorkoutHistoryPage() {
  const [mode, setMode] = useState<'session' | 'exercise' | 'calendar'>('session')

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
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addExercise, setAddExercise] = useState('')
  const [addReps, setAddReps] = useState('')
  const [addWeight, setAddWeight] = useState('')
  const [addRpe, setAddRpe] = useState('')
  const [addingSet, setAddingSet] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/workouts/history?limit=90').then((r) => r.json()),
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

  async function deleteWorkout(id: string) {
    if (!confirm('Eliminare questa sessione?')) return
    setDeletingId(id)
    await fetch(`/api/workouts/${id}`, { method: 'DELETE' })
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    setDeletingId(null)
  }

  async function handleAddSet(e: React.FormEvent, workoutId: string) {
    e.preventDefault()
    if (!addExercise.trim()) return
    setAddingSet(true)
    const workout = workouts.find((w) => w.id === workoutId)
    const sameEx = workout?.sets.filter((s) => s.exercise_name === addExercise).length ?? 0
    await fetch('/api/workouts/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout_id: workoutId,
        exercise_name: addExercise,
        set_number: sameEx + 1,
        reps: addReps ? parseInt(addReps) : null,
        weight_kg: addWeight ? parseFloat(addWeight) : null,
        rpe: addRpe ? parseInt(addRpe) : null,
      }),
    })
    // Reload workouts list
    const res = await fetch('/api/workouts/history?limit=90')
    const data = await res.json()
    if (data.workouts) setWorkouts(data.workouts)
    setAddReps('')
    setAddWeight('')
    setAddRpe('')
    setAddingSet(false)
  }

  const WORKOUT_LABELS: Record<string, string> = {
    strength: 'Forza', cardio: 'Cardio', hiit: 'HIIT',
    mobility: 'Mobilità', torso_limbs_4x: 'Torso Limbs 4×',
  }

  // ── Calendar helpers ──
  function buildCalendar() {
    const today = localToday()
    const workoutByDate = new Map<string, WorkoutEntry>()
    workouts.forEach((w) => workoutByDate.set(w.logged_date, w))

    const days: { date: string; workout: WorkoutEntry | null }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d)
      days.push({ date: dateStr, workout: workoutByDate.get(dateStr) ?? null })
    }

    // Calculate streak (consecutive days with workout ending at today)
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].workout) streak++
      else break
    }

    // Pad start to Monday (dow 0=Mon)
    const firstDate = new Date(days[0].date + 'T12:00:00')
    const firstDow = (firstDate.getDay() + 6) % 7
    const padded: ({ date: string; workout: WorkoutEntry | null } | null)[] = [
      ...Array(firstDow).fill(null),
      ...days,
    ]

    const weeks: ({ date: string; workout: WorkoutEntry | null } | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7))
    }

    const totalSessions = days.filter((d) => d.workout).length
    return { weeks, streak, totalSessions, today }
  }

  function sessionColor(workout: WorkoutEntry | null) {
    if (!workout) return null
    return SESSION_TYPES.find((s) => s.key === workout.title)?.color ?? '#fb923c'
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
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(109,40,217,0.15)' }}>
        {[
          { key: 'session',  label: 'Per Sessione', icon: '📋' },
          { key: 'exercise', label: 'Per Esercizio', icon: '📈' },
          { key: 'calendar', label: 'Calendario',   icon: '📅' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key as 'session' | 'exercise' | 'calendar')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
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

          <div className="grid grid-cols-2 gap-2">
            {SESSION_TYPES.map((s) => (
              <button
                key={s.key}
                onClick={() => getSessionCoach(s.key)}
                disabled={sessionLoading && selectedSession === s.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={selectedSession === s.key ? {
                  background: s.bg,
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

          {sessionError && (
            <p className="text-sm text-center" style={{ color: '#f87171' }}>{sessionError}</p>
          )}

          {sessionCoach && !sessionLoading && (
            <div className="space-y-4">
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

              <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="text-sm italic" style={{ color: '#b8add2' }}>{sessionCoach.session_note}</p>
              </div>

              <div className="space-y-2">
                {sessionCoach.exercises.map((ex, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(109,40,217,0.15)' }}>
                    <div className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: 'rgba(124,58,237,0.06)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>{ex.exercise}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                        {ex.adjustment}
                      </span>
                    </div>
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

      {/* ════════════════════════════════════════════
          MODE: CALENDARIO
      ════════════════════════════════════════════ */}
      {mode === 'calendar' && (() => {
        const { weeks, streak, totalSessions, today } = buildCalendar()
        return (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sessioni (90gg)', value: totalSessions, color: '#a78bfa' },
                { label: 'Streak attuale', value: `${streak}gg`, color: streak >= 3 ? '#22c55e' : '#fb923c' },
                { label: 'Media/settimana', value: (totalSessions / 13).toFixed(1), color: '#60a5fa' },
              ].map((s) => (
                <div key={s.label} className="card p-3 text-center">
                  <p className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: '#4a4268' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {SESSION_TYPES.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: s.color, opacity: 0.85 }} />
                  <span className="text-[11px]" style={{ color: '#6b5f8a' }}>{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: '#fb923c', opacity: 0.85 }} />
                <span className="text-[11px]" style={{ color: '#6b5f8a' }}>Altro</span>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="card p-4 overflow-x-auto">
              {/* Day headers */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-semibold uppercase"
                    style={{ color: '#4a4268' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="space-y-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid gap-1" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={di} />
                      const color = sessionColor(day.workout)
                      const isToday = day.date === today
                      return (
                        <div
                          key={di}
                          title={day.workout ? `${day.date}: ${day.workout.title ?? day.workout.workout_type}` : day.date}
                          className="aspect-square rounded-sm transition-transform hover:scale-110"
                          style={{
                            background: color ?? 'rgba(139,92,246,0.06)',
                            opacity: color ? 0.85 : 1,
                            border: isToday
                              ? '1.5px solid rgba(167,139,250,0.7)'
                              : color
                                ? '1px solid transparent'
                                : '1px solid rgba(109,40,217,0.1)',
                            cursor: day.workout ? 'pointer' : 'default',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>

              <p className="text-[10px] mt-3 text-center" style={{ color: '#3d3459' }}>
                Ultimi 90 giorni · {today}
              </p>
            </div>

            {/* Breakdown by session type */}
            <div className="card p-4 space-y-3">
              <p className="section-label">Sessioni per tipo</p>
              {SESSION_TYPES.map((s) => {
                const count = workouts.filter((w) => w.title === s.key).length
                const pct = totalSessions > 0 ? count / totalSessions : 0
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                        <span className="text-xs" style={{ color: '#8b7faa' }}>{s.label}</span>
                      </div>
                      <span className="font-mono text-xs" style={{ color: '#6b5f8a' }}>{count}×</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(139,92,246,0.08)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct * 100}%`, background: s.color, opacity: 0.7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Sessioni recenti (sempre visibili tranne calendario) ── */}
      {mode !== 'calendar' && (
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
            const sColor = SESSION_TYPES.find((s) => s.key === w.title)?.color
            const isAdding = addingTo === w.id
            return (
              <div key={w.id} className="card overflow-hidden">
                {/* Header row */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <button onClick={() => toggleExpand(w.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    {sColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sColor }} />}
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>
                        {w.title ?? WORKOUT_LABELS[w.workout_type] ?? w.workout_type}
                      </span>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: '#5e5479' }}>{w.logged_date}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    {w.volume_kg > 0 && (
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold" style={{ color: '#fb923c' }}>
                          {w.volume_kg.toLocaleString()}<span className="text-[10px] ml-0.5" style={{ color: '#5e5479' }}>kg</span>
                        </p>
                        <p className="text-[10px]" style={{ color: '#5e5479' }}>volume</p>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => deleteWorkout(w.id)}
                      disabled={deletingId === w.id}
                      title="Elimina sessione"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#4a4268' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#4a4268')}
                    >
                      {deletingId === w.id ? (
                        <span className="text-[10px]">...</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      )}
                    </button>
                    <button onClick={() => toggleExpand(w.id)} style={{ color: '#5e5479', fontSize: 12 }}>
                      {open ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Collapsed: exercise chips */}
                {exNames.length > 0 && !open && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {exNames.slice(0, 5).map((ex) => (
                      <span key={ex} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: '#8b7faa' }}>
                        {ex}
                      </span>
                    ))}
                    {exNames.length > 5 && <span className="text-[10px]" style={{ color: '#5e5479' }}>+{exNames.length - 5}</span>}
                  </div>
                )}

                {/* Expanded: sets table */}
                {open && (
                  <div style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                    {w.sets.length > 0 && (
                      <div className="overflow-x-auto">
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
                    {w.sets.length === 0 && (
                      <p className="px-4 py-3 text-xs" style={{ color: '#5e5479' }}>Nessuna serie loggata.</p>
                    )}

                    {/* Add exercise section */}
                    <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(139,92,246,0.08)' }}>
                      {!isAdding ? (
                        <button
                          onClick={() => { setAddingTo(w.id); setAddExercise('') }}
                          className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          style={{ color: '#7c3aed' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          Aggiungi esercizio
                        </button>
                      ) : (
                        <form onSubmit={(e) => handleAddSet(e, w.id)} className="space-y-2">
                          <input
                            type="text"
                            value={addExercise}
                            onChange={(e) => setAddExercise(e.target.value)}
                            placeholder="Nome esercizio (es. Alzate laterali)"
                            required
                            className="inp"
                            autoFocus
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-[10px] mb-1" style={{ color: '#6b5f8a' }}>Reps</p>
                              <input type="number" value={addReps} onChange={(e) => setAddReps(e.target.value)} placeholder="12" className="inp" />
                            </div>
                            <div>
                              <p className="text-[10px] mb-1" style={{ color: '#6b5f8a' }}>Peso (kg)</p>
                              <input type="number" step="0.5" value={addWeight} onChange={(e) => setAddWeight(e.target.value)} placeholder="10" className="inp" />
                            </div>
                            <div>
                              <p className="text-[10px] mb-1" style={{ color: '#6b5f8a' }}>RPE</p>
                              <input type="number" min="1" max="10" value={addRpe} onChange={(e) => setAddRpe(e.target.value)} placeholder="8" className="inp" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="submit" disabled={addingSet || !addExercise.trim()} className="btn-primary flex-1 text-sm py-2">
                              {addingSet ? 'Salvataggio...' : 'Log serie'}
                            </button>
                            <button type="button" onClick={() => setAddingTo(null)} className="btn-ghost text-sm px-4 py-2">
                              Annulla
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
