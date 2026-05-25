'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Torso Limbs 4x program ──────────────────────────────────────────────────
// Fill in your exercises here once confirmed

interface ExerciseTemplate {
  name: string
  sets: number
  reps: string
  rest: string
}

type TorsoLimbsDay = 'TORSO A' | 'LIMBS' | 'TORSO B' | 'TORSO C'

const TORSO_LIMBS_PROGRAM: Record<TorsoLimbsDay, ExerciseTemplate[]> = {
  'TORSO A': [],
  'LIMBS': [],
  'TORSO B': [],
  'TORSO C': [],
}

const TORSO_LIMBS_DAYS: TorsoLimbsDay[] = ['TORSO A', 'LIMBS', 'TORSO B', 'TORSO C']

// ── Types ───────────────────────────────────────────────────────────────────

interface WorkoutSet {
  id: string
  exercise_name: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  rpe: number | null
}

interface Workout {
  id: string
  workout_type: string
  title: string | null
  duration_min: number | null
  sets: WorkoutSet[]
}

const WORKOUT_TYPES = [
  { value: 'strength', label: 'Forza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'mobility', label: 'Mobilità' },
  { value: 'torso_limbs_4x', label: 'Torso Limbs 4×' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function LogWorkoutsPage() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null)

  // New workout form
  const [newType, setNewType] = useState('strength')
  const [newTitle, setNewTitle] = useState('')
  const [selectedDay, setSelectedDay] = useState<TorsoLimbsDay>('TORSO A')
  const [creating, setCreating] = useState(false)

  // Free-form set logging (for non-template workouts)
  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [rpe, setRpe] = useState('')
  const [addingSet, setAddingSet] = useState(false)

  // Template set weights (for Torso Limbs)
  const [templateWeights, setTemplateWeights] = useState<Record<string, Record<number, string>>>({})
  const [templateReps, setTemplateReps] = useState<Record<string, Record<number, string>>>({})
  const [savingTemplate, setSavingTemplate] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts?date=${today}`)
    const data = await res.json()
    if (data.workouts) setWorkouts(data.workouts)
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  const isTorsoLimbs = newType === 'torso_limbs_4x'
  const activeExercises = isTorsoLimbs ? TORSO_LIMBS_PROGRAM[selectedDay] : []

  async function createWorkout(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const title = isTorsoLimbs ? selectedDay : (newTitle || null)
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_type: newType, title, logged_date: today }),
    })
    const data = await res.json()
    setCreating(false)
    if (data.workout) {
      await load()
      setActiveWorkout(data.workout.id)
      setNewTitle('')
    }
  }

  async function addSet(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkout || !exercise) return
    setAddingSet(true)
    const workout = workouts.find((w) => w.id === activeWorkout)
    const sameExerciseSets = workout?.sets.filter((s) => s.exercise_name === exercise).length ?? 0
    await fetch('/api/workouts/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout_id: activeWorkout,
        exercise_name: exercise,
        set_number: sameExerciseSets + 1,
        reps: reps ? parseInt(reps) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        rpe: rpe ? parseInt(rpe) : null,
      }),
    })
    await load()
    setReps('')
    setWeight('')
    setRpe('')
    setAddingSet(false)
  }

  async function saveTemplateWorkout() {
    if (!activeWorkout) return
    setSavingTemplate(true)
    const promises: Promise<Response>[] = []
    activeExercises.forEach((ex) => {
      for (let s = 1; s <= ex.sets; s++) {
        const w = templateWeights[ex.name]?.[s]
        const r = templateReps[ex.name]?.[s]
        if (w || r) {
          promises.push(fetch('/api/workouts/sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workout_id: activeWorkout,
              exercise_name: ex.name,
              set_number: s,
              reps: r ? parseInt(r) : null,
              weight_kg: w ? parseFloat(w) : null,
              rpe: null,
            }),
          }))
        }
      }
    })
    await Promise.all(promises)
    await load()
    setTemplateWeights({})
    setTemplateReps({})
    setSavingTemplate(false)
  }

  function setWeight2(exerciseName: string, setNum: number, val: string) {
    setTemplateWeights((prev) => ({
      ...prev,
      [exerciseName]: { ...(prev[exerciseName] ?? {}), [setNum]: val },
    }))
  }

  function setReps2(exerciseName: string, setNum: number, val: string) {
    setTemplateReps((prev) => ({
      ...prev,
      [exerciseName]: { ...(prev[exerciseName] ?? {}), [setNum]: val },
    }))
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
      </div>
    )
  }

  const activeW = workouts.find((w) => w.id === activeWorkout)
  const isActiveTemplate = activeW?.workout_type === 'torso_limbs_4x'
  const activeTemplateExercises = activeW?.title ? TORSO_LIMBS_PROGRAM[activeW.title as TorsoLimbsDay] ?? [] : []

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Workout</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{today}</p>
      </div>

      {/* New workout */}
      <div className="card p-5 space-y-4">
        <p className="section-label">Nuovo workout</p>
        <form onSubmit={createWorkout} className="space-y-3">
          {/* Type selector */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Tipo</p>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setNewType(t.value)}
                  className="px-3 py-1.5 rounded-lg text-[13px] transition-all"
                  style={newType === t.value ? {
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent)',
                  } : {
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Torso Limbs day selector */}
          {isTorsoLimbs ? (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Giorno</p>
              <div className="grid grid-cols-4 gap-2">
                {TORSO_LIMBS_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className="py-2 px-2 rounded-lg text-[12px] font-semibold transition-all text-center"
                    style={selectedDay === day ? {
                      background: 'var(--accent-bg)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent)',
                    } : {
                      background: 'var(--surface-soft)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titolo (opzionale, es. Push Day)"
              className="inp"
            />
          )}

          {/* Preview exercises if template */}
          {isTorsoLimbs && activeExercises.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-3 py-2" style={{ background: 'var(--surface-soft)' }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Esercizi — {selectedDay}
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                {activeExercises.map((ex) => (
                  <div key={ex.name} className="px-3 py-2 flex items-center justify-between">
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{ex.name}</p>
                    <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {ex.sets}×{ex.reps} · {ex.rest}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTorsoLimbs && activeExercises.length === 0 && (
            <div className="rounded-lg px-4 py-3 text-sm"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Inviami la lista degli esercizi per {selectedDay} e la configuro subito.
            </div>
          )}

          <button type="submit" disabled={creating} className="btn-primary w-full">
            {creating ? 'Creazione...' : 'Inizia workout'}
          </button>
        </form>
      </div>

      {/* Active workout */}
      {activeWorkout && activeW && (
        <div className="card p-5 space-y-4 card-active">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
              {activeW.title ?? activeW.workout_type}
            </p>
            <button onClick={() => setActiveWorkout(null)} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Chiudi
            </button>
          </div>

          {/* Template mode */}
          {isActiveTemplate && activeTemplateExercises.length > 0 ? (
            <div className="space-y-4">
              {activeTemplateExercises.map((ex) => (
                <div key={ex.name} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--surface-soft)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{ex.name}</p>
                    <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {ex.sets} serie · {ex.reps} reps · {ex.rest} rec
                    </p>
                  </div>
                  <div className="p-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${ex.sets}, 1fr)` }}>
                    {Array.from({ length: ex.sets }, (_, i) => i + 1).map((s) => (
                      <div key={s} className="space-y-1">
                        <p className="text-[10px] text-center uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                          Serie {s}
                        </p>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="kg"
                          value={templateWeights[ex.name]?.[s] ?? ''}
                          onChange={(e) => setWeight2(ex.name, s, e.target.value)}
                          className="inp text-center text-sm"
                        />
                        <input
                          type="number"
                          placeholder="reps"
                          value={templateReps[ex.name]?.[s] ?? ''}
                          onChange={(e) => setReps2(ex.name, s, e.target.value)}
                          className="inp text-center text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={saveTemplateWorkout} disabled={savingTemplate} className="btn-primary w-full">
                {savingTemplate ? 'Salvataggio...' : 'Salva workout'}
              </button>
            </div>
          ) : (
            /* Free-form mode */
            <form onSubmit={addSet} className="space-y-3">
              <input
                type="text"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="Nome esercizio"
                required
                className="inp"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Reps</p>
                  <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="8" className="inp" />
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Peso (kg)</p>
                  <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" className="inp" />
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>RPE</p>
                  <input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="8" className="inp" />
                </div>
              </div>
              <button type="submit" disabled={addingSet || !exercise} className="btn-primary w-full">
                {addingSet ? '...' : 'Log serie'}
              </button>
            </form>
          )}

          {/* Logged sets */}
          {activeW.sets.length > 0 && !isActiveTemplate && (
            <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-sm min-w-[340px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Esercizio', 'Serie', 'Reps', 'kg', 'RPE'].map((h) => (
                      <th key={h} className={`py-2 text-[10px] uppercase tracking-wide font-semibold ${h === 'Esercizio' ? 'text-left px-3' : 'text-right px-2'}`}
                        style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeW.sets.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                      <td className="py-2 px-3 text-sm" style={{ color: 'var(--text)' }}>{s.exercise_name}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.set_number}</td>
                      <td className="py-2 px-2 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{s.reps ?? '—'}</td>
                      <td className="py-2 px-2 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{s.weight_kg ?? '—'}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{s.rpe ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Today's workouts */}
      {workouts.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">Oggi</p>
          {workouts.map((w) => (
            <div key={w.id} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {w.title ?? WORKOUT_TYPES.find((t) => t.value === w.workout_type)?.label ?? w.workout_type}
                  </span>
                  <span className="pill">{w.workout_type}</span>
                </div>
                <button
                  onClick={() => setActiveWorkout(w.id === activeWorkout ? null : w.id)}
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: 'var(--accent)' }}>
                  {w.id === activeWorkout ? 'Chiudi' : 'Apri'}
                </button>
              </div>
              <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {w.sets.length} serie loggat{w.sets.length === 1 ? 'a' : 'e'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
