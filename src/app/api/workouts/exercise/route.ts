import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Workout, WorkoutSet } from '@/lib/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const exercise = searchParams.get('name')

  // Get all workout IDs for user
  const { data: wRaw } = await supabase
    .from('workouts').select('id, logged_date').eq('user_id', user.id)
    .order('logged_date', { ascending: true })
  const workouts = (wRaw ?? []) as Pick<Workout, 'id' | 'logged_date'>[]
  if (!workouts.length) return NextResponse.json({ exercises: [], progression: [], pr: null })

  const wMap = new Map(workouts.map((w) => [w.id, w.logged_date]))
  const wIds = workouts.map((w) => w.id)

  if (!exercise) {
    // Return list of unique exercises
    const { data: sRaw } = await supabase
      .from('workout_sets').select('exercise_name').in('workout_id', wIds)
    const exercises = [...new Set((sRaw ?? []).map((s: { exercise_name: string }) => s.exercise_name))].sort()
    return NextResponse.json({ exercises })
  }

  // Progression for specific exercise
  const { data: sRaw } = await supabase
    .from('workout_sets').select('*')
    .in('workout_id', wIds)
    .ilike('exercise_name', `%${exercise}%`)
    .order('created_at', { ascending: true })

  const sets = (sRaw ?? []) as WorkoutSet[]
  if (!sets.length) return NextResponse.json({ exercises: [], progression: [], pr: null })

  // Group best set per training day
  const byDate = new Map<string, { maxWeight: number; bestReps: number; volume: number; sets: number }>()
  sets.forEach((s) => {
    const date = wMap.get(s.workout_id)
    if (!date) return
    const cur = byDate.get(date) ?? { maxWeight: 0, bestReps: 0, volume: 0, sets: 0 }
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    byDate.set(date, {
      maxWeight: Math.max(cur.maxWeight, w),
      bestReps: w >= cur.maxWeight ? r : cur.bestReps,
      volume: cur.volume + w * r,
      sets: cur.sets + 1,
    })
  })

  const progression = Array.from(byDate.entries())
    .map(([date, d]) => ({ date, ...d, volume: Math.round(d.volume) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // All-time PR
  const pr = sets.reduce<WorkoutSet | null>((best, s) => {
    if (!best || (s.weight_kg ?? 0) > (best.weight_kg ?? 0)) return s
    return best
  }, null)

  return NextResponse.json({
    exercises: [],
    progression,
    pr: pr ? { weight_kg: pr.weight_kg, reps: pr.reps, date: wMap.get(pr.workout_id) } : null,
  })
}
