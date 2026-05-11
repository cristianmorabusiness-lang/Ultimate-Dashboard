'use client'

import { useEffect, useState, useCallback } from 'react'

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

const WORKOUT_TYPES = ['strength', 'cardio', 'hiit', 'mobility']

export default function LogWorkoutsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null)

  const [newType, setNewType] = useState('strength')
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [rpe, setRpe] = useState('')
  const [addingSet, setAddingSet] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts?date=${today}`)
    const data = await res.json()
    if (data.workouts) setWorkouts(data.workouts)
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  async function createWorkout(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout_type: newType, title: newTitle || null, logged_date: today }),
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Log Workout</h1>
        <p className="text-neutral-400 text-sm">{today}</p>
      </div>

      {/* Create new workout */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-neutral-300 mb-4">New workout</h2>
        <form onSubmit={createWorkout} className="flex gap-3">
          <select value={newType} onChange={(e) => setNewType(e.target.value)} className={`${inp} w-36`}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional, e.g. Push Day A)"
            className={`${inp} flex-1`}
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {creating ? '...' : 'Start'}
          </button>
        </form>
      </div>

      {/* Active workout — add sets */}
      {activeWorkout && (() => {
        const w = workouts.find((wk) => wk.id === activeWorkout)
        if (!w) return null
        return (
          <div className="bg-neutral-900 border border-emerald-800/50 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-emerald-400">
              Active: {w.title ?? w.workout_type}
            </h2>

            <form onSubmit={addSet} className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="Exercise name"
                required
                className={`${inp} col-span-4`}
              />
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Reps</label>
                <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="5" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Weight (kg)</label>
                <input type="number" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="100" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">RPE (1–10)</label>
                <input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(e.target.value)} placeholder="8" className={inp} />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingSet || !exercise}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {addingSet ? '...' : 'Log set'}
                </button>
              </div>
            </form>

            {w.sets.length > 0 && (
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-xs text-neutral-500">
                    <th className="text-left pb-2">Exercise</th>
                    <th className="text-right pb-2">Set</th>
                    <th className="text-right pb-2">Reps</th>
                    <th className="text-right pb-2">kg</th>
                    <th className="text-right pb-2">RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {w.sets.map((s) => (
                    <tr key={s.id} className="border-t border-neutral-800/50">
                      <td className="py-1.5 text-neutral-200">{s.exercise_name}</td>
                      <td className="py-1.5 text-right text-neutral-400">{s.set_number}</td>
                      <td className="py-1.5 text-right text-neutral-300">{s.reps ?? '—'}</td>
                      <td className="py-1.5 text-right text-neutral-300">{s.weight_kg ?? '—'}</td>
                      <td className="py-1.5 text-right text-neutral-500">{s.rpe ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })()}

      {/* All today's workouts */}
      {workouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-400">Today&apos;s workouts</h2>
          {workouts.map((w) => (
            <div key={w.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-neutral-200">{w.title ?? w.workout_type}</span>
                  <span className="ml-2 text-xs text-neutral-500 capitalize">{w.workout_type}</span>
                </div>
                <button
                  onClick={() => setActiveWorkout(w.id === activeWorkout ? null : w.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {w.id === activeWorkout ? 'Collapse' : 'Add sets'}
                </button>
              </div>
              <p className="text-xs text-neutral-500">{w.sets.length} set{w.sets.length !== 1 ? 's' : ''} logged</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inp = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
