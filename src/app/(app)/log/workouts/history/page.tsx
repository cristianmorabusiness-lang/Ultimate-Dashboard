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
  backgroundColor: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)',
  borderRadius: '8px', fontSize: '11px', color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

const SESSION_TYPES = [
  { key: 'Torso A', label: 'Torso A', color: 'var(--danger)',  bg: 'var(--danger-bg)' },
  { key: 'Limbs',   label: 'Limbs',   color: 'var(--success)', bg: 'var(--success-bg)' },
  { key: 'Torso B', label: 'Torso B', color: 'var(--info)',    bg: 'var(--info-bg)' },
  { key: 'Torso C', label: 'Torso C', color: 'var(--accent)',  bg: 'var(--accent-bg)' },
]

function findSessionType(title: string | null | undefined) {
  if (!title) return undefined
  return SESSION_TYPES.find((s) => s.key.toLowerCase() === title.toLowerCase())
}

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
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [editEx, setEditEx] = useState('')
  const [editReps, setEditReps] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editRpe, setEditRpe] = useState('')
  const [savingSet, setSavingSet] = useState(false)
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null)

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

  function startEditSet(s: WorkoutSet) {
    setEditingSetId(s.id)
    setEditEx(s.exercise_name)
    setEditReps(s.reps != null ? String(s.reps) : '')
    setEditWeight(s.weight_kg != null ? String(s.weight_kg) : '')
    setEditRpe(s.rpe != null ? String(s.rpe) : '')
  }

  function cancelEditSet() {
    setEditingSetId(null)
  }

  async function saveEditSet(setId: string) {
    if (!editEx.trim()) return
    setSavingSet(true)
    const res = await fetch(`/api/workouts/sets/${setId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_name: editEx.trim(),
        reps: editReps === '' ? null : parseInt(editReps),
        weight_kg: editWeight === '' ? null : parseFloat(editWeight),
        rpe: editRpe === '' ? null : parseInt(editRpe),
      }),
    })
    if (res.ok) {
      const refresh = await fetch('/api/workouts/history?limit=90').then((r) => r.json())
      if (refresh.workouts) setWorkouts(refresh.workouts)
      setEditingSetId(null)
    }
    setSavingSet(false)
  }

  async function deleteSet(setId: string) {
    if (!confirm('Eliminare questa serie?')) return
    setDeletingSetId(setId)
    const res = await fetch(`/api/workouts/sets/${setId}`, { method: 'DELETE' })
    if (res.ok) {
      const refresh = await fetch('/api/workouts/history?limit=90').then((r) => r.json())
      if (refresh.workouts) setWorkouts(refresh.workouts)
    }
    setDeletingSetId(null)
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
    return findSessionType(workout.title)?.color ?? '#fb923c'
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Storico Workout
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Analisi e progressione</p>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
        {[
          { key: 'session',  label: 'Per Sessione', icon: '📋' },
          { key: 'exercise', label: 'Per Esercizio', icon: '📈' },
          { key: 'calendar', label: 'Calendario',   icon: '📅' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key as 'session' | 'exercise' | 'calendar')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all"
            style={mode === m.key ? {
              background: 'var(--surface-1)',
              color: 'var(--accent)',
              boxShadow: 'inset 0 0 0 1px var(--accent-border)',
            } : { color: 'var(--text-muted)' }}
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Seleziona una giornata — l&apos;AI analizza l&apos;ultima sessione e ti dice cosa aggiustare
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SESSION_TYPES.map((s) => (
              <button
                key={s.key}
                onClick={() => getSessionCoach(s.key)}
                disabled={sessionLoading && selectedSession === s.key}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={selectedSession === s.key ? {
                  background: s.bg,
                  border: `1px solid ${s.color}`,
                  color: 'var(--text)',
                } : {
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="font-semibold text-sm">{s.label}</span>
                {sessionLoading && selectedSession === s.key && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>analisi...</span>
                )}
              </button>
            ))}
          </div>

          {sessionError && (
            <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{sessionError}</p>
          )}

          {sessionCoach && !sessionLoading && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                  Piano per la prossima {selectedSession}
                </p>
                {sessionDate && (
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                    basato su {sessionDate}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>{sessionCoach.session_note}</p>
              </div>

              <div className="space-y-2">
                {sessionCoach.exercises.map((ex, i) => (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--surface-soft)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{ex.exercise}</p>
                      <span className="pill pill-accent">{ex.adjustment}</span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Ultima sess.</p>
                        <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{ex.last_best}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Prossima</p>
                        <p className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
                          {ex.suggested_weight ? `${ex.suggested_weight}kg` : '—'}
                          <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
                            × {ex.suggested_reps}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Nota</p>
                        <p className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{ex.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!sessionCoach && !sessionLoading && !sessionError && (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Seleziona una sessione per analizzarla</p>
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Progressione dettagliata e coaching per un singolo esercizio</p>
          </div>

          <select value={selectedEx} onChange={(e) => setSelectedEx(e.target.value)} className="inp">
            <option value="">— Seleziona un esercizio —</option>
            {exercises.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
          </select>

          {selectedEx && pr && (
            <div className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              <span className="text-lg">🏆</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                  Personal Record
                </p>
                <p className="font-mono text-base font-bold" style={{ color: 'var(--text)' }}>
                  {pr.weight_kg}kg × {pr.reps} reps
                  <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>{pr.date}</span>
                </p>
              </div>
            </div>
          )}

          {selectedEx && progression.length > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Carico massimo per sessione</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={progression.map((p) => ({ ...p, date: p.date.slice(5) }))}
                    margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={36}
                      tickFormatter={(v) => `${v}kg`} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}kg`, 'Max peso']} />
                    {pr?.weight_kg && (
                      <ReferenceLine y={pr.weight_kg} stroke="var(--chart-grid)" strokeDasharray="4 3" />
                    )}
                    <Line type="monotone" dataKey="maxWeight" stroke="var(--accent)" strokeWidth={2}
                      dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: 'var(--accent-soft)', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Volume per sessione (kg totali)</p>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={progression.map((p) => ({ ...p, date: p.date.slice(5) }))}
                    margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [`${v}kg`, 'Volume']} />
                    <Line type="monotone" dataKey="volume" stroke="var(--warning)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <button onClick={getExCoach} disabled={exCoachLoading} className="btn-ghost w-full">
                  {exCoachLoading ? 'Analisi in corso...' : '🤖 Coaching AI per questo esercizio'}
                </button>
                {exCoach && (
                  <div className="mt-3 rounded-lg p-4 space-y-2"
                    style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                    {exCoach.suggested_weight && (
                      <p className="font-mono text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        {exCoach.suggested_weight}kg · {exCoach.suggested_reps}
                      </p>
                    )}
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{exCoach.rationale}</p>
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{exCoach.progression_note}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedEx && progression.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nessun dato trovato per questo esercizio.</p>
          )}

          {!selectedEx && (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Seleziona un esercizio per vedere la progressione</p>
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
                { label: 'Sessioni (90gg)', value: totalSessions, color: 'var(--accent)' },
                { label: 'Streak attuale', value: `${streak}gg`, color: streak >= 3 ? 'var(--success)' : 'var(--warning)' },
                { label: 'Media/settimana', value: (totalSessions / 13).toFixed(1), color: 'var(--info)' },
              ].map((s) => (
                <div key={s.label} className="card p-3 text-center">
                  <p className="font-mono text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {SESSION_TYPES.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--warning)' }} />
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Altro</span>
              </div>
            </div>

            {/* Calendar grid */}
            <div className="card p-4 overflow-x-auto">
              {/* Day headers */}
              <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="text-center text-[9px] font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}>
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
                            background: color ?? 'var(--surface-soft)',
                            opacity: color ? 0.85 : 1,
                            border: isToday
                              ? '1.5px solid var(--accent)'
                              : color
                                ? '1px solid transparent'
                                : '1px solid var(--border)',
                            cursor: day.workout ? 'pointer' : 'default',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>

              <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-dim)' }}>
                Ultimi 90 giorni · {today}
              </p>
            </div>

            {/* Breakdown by session type */}
            <div className="card p-4 space-y-3">
              <p className="section-label">Sessioni per tipo</p>
              {SESSION_TYPES.map((s) => {
                const count = workouts.filter((w) => w.title?.toLowerCase() === s.key.toLowerCase()).length
                const pct = totalSessions > 0 ? count / totalSessions : 0
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                      </div>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{count}×</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct * 100}%`, background: s.color, opacity: 0.8 }} />
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
          {loading && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>}

          {!loading && workouts.length === 0 && (
            <div className="card p-10 text-center">
              <p style={{ color: 'var(--text-muted)' }}>Nessun workout ancora.</p>
            </div>
          )}

          {workouts.map((w) => {
            const open = expanded.has(w.id)
            const exNames = [...new Set(w.sets.map((s) => s.exercise_name))]
            const sColor = findSessionType(w.title)?.color
            const isAdding = addingTo === w.id
            return (
              <div key={w.id} className="card overflow-hidden">
                {/* Header row */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <button onClick={() => toggleExpand(w.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    {sColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sColor }} />}
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {w.title ?? WORKOUT_LABELS[w.workout_type] ?? w.workout_type}
                      </span>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{w.logged_date}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    {w.volume_kg > 0 && (
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                          {w.volume_kg.toLocaleString()}<span className="text-[10px] ml-0.5" style={{ color: 'var(--text-dim)' }}>kg</span>
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>volume</p>
                      </div>
                    )}
                    {/* Delete button */}
                    <button
                      onClick={() => deleteWorkout(w.id)}
                      disabled={deletingId === w.id}
                      title="Elimina sessione"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      {deletingId === w.id ? (
                        <span className="text-[10px]">...</span>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      )}
                    </button>
                    <button onClick={() => toggleExpand(w.id)} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {open ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Collapsed: exercise chips */}
                {exNames.length > 0 && !open && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {exNames.slice(0, 5).map((ex) => (
                      <span key={ex} className="pill">{ex}</span>
                    ))}
                    {exNames.length > 5 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{exNames.length - 5}</span>}
                  </div>
                )}

                {/* Expanded: sets table */}
                {open && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {w.sets.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[380px]">
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Esercizio', 'S', 'Reps', 'kg', 'RPE', ''].map((h, i) => (
                                <th key={i} className={`py-2 text-[10px] uppercase tracking-wide font-semibold ${i === 0 ? 'text-left px-4' : 'text-right px-2'}`}
                                  style={{ color: 'var(--text-muted)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {w.sets.map((s) => {
                              const isEditing = editingSetId === s.id
                              if (isEditing) {
                                return (
                                  <tr key={s.id} style={{ borderBottom: '1px solid var(--divider)', background: 'var(--accent-bg)' }}>
                                    <td className="py-1.5 px-4">
                                      <input
                                        type="text"
                                        value={editEx}
                                        onChange={(e) => setEditEx(e.target.value)}
                                        className="inp"
                                        style={{ padding: '4px 8px', fontSize: 12 }}
                                      />
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.set_number}</td>
                                    <td className="py-1.5 px-1">
                                      <input
                                        type="number"
                                        value={editReps}
                                        onChange={(e) => setEditReps(e.target.value)}
                                        className="inp text-right"
                                        style={{ padding: '4px 6px', fontSize: 12, width: 56 }}
                                      />
                                    </td>
                                    <td className="py-1.5 px-1">
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={editWeight}
                                        onChange={(e) => setEditWeight(e.target.value)}
                                        className="inp text-right"
                                        style={{ padding: '4px 6px', fontSize: 12, width: 64 }}
                                      />
                                    </td>
                                    <td className="py-1.5 px-1">
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={editRpe}
                                        onChange={(e) => setEditRpe(e.target.value)}
                                        className="inp text-right"
                                        style={{ padding: '4px 6px', fontSize: 12, width: 48 }}
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => saveEditSet(s.id)}
                                          disabled={savingSet || !editEx.trim()}
                                          title="Salva"
                                          className="p-1 rounded transition-colors"
                                          style={{ color: 'var(--success)' }}
                                        >
                                          {savingSet ? (
                                            <span className="text-[10px]">...</span>
                                          ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                              <path d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </button>
                                        <button
                                          onClick={cancelEditSet}
                                          title="Annulla"
                                          className="p-1 rounded transition-colors"
                                          style={{ color: 'var(--text-muted)' }}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M6 6l12 12M18 6L6 18" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              }
                              return (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                                  <td className="py-2 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{s.exercise_name}</td>
                                  <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.set_number}</td>
                                  <td className="py-2 px-2 text-right font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.reps ?? '—'}</td>
                                  <td className="py-2 px-2 text-right font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.weight_kg ?? '—'}</td>
                                  <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.rpe ?? '—'}</td>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => startEditSet(s)}
                                        title="Modifica serie"
                                        className="p-1 rounded transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => deleteSet(s.id)}
                                        disabled={deletingSetId === s.id}
                                        title="Elimina serie"
                                        className="p-1 rounded transition-colors"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                      >
                                        {deletingSetId === s.id ? (
                                          <span className="text-[10px]">...</span>
                                        ) : (
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {w.sets.length === 0 && (
                      <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>Nessuna serie loggata.</p>
                    )}

                    {/* Add exercise section */}
                    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                      {!isAdding ? (
                        <button
                          onClick={() => { setAddingTo(w.id); setAddExercise('') }}
                          className="text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          style={{ color: 'var(--accent)' }}
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
                              <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Reps</p>
                              <input type="number" value={addReps} onChange={(e) => setAddReps(e.target.value)} placeholder="12" className="inp" />
                            </div>
                            <div>
                              <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Peso (kg)</p>
                              <input type="number" step="0.5" value={addWeight} onChange={(e) => setAddWeight(e.target.value)} placeholder="10" className="inp" />
                            </div>
                            <div>
                              <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>RPE</p>
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
