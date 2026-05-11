import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Workout, WorkoutSet } from '@/lib/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { data: workoutsRaw } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .eq('logged_date', date)
    .order('created_at', { ascending: true })

  const workouts = (workoutsRaw ?? []) as Workout[]
  if (workouts.length === 0) return NextResponse.json({ workouts: [] })

  const workoutIds = workouts.map((w) => w.id)
  const { data: setsRaw } = await supabase
    .from('workout_sets')
    .select('*')
    .in('workout_id', workoutIds)
    .order('created_at', { ascending: true })

  const sets = (setsRaw ?? []) as WorkoutSet[]
  const result = workouts.map((w) => ({
    ...w,
    sets: sets.filter((s) => s.workout_id === w.id),
  }))

  return NextResponse.json({ workouts: result })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workout_type, title, logged_date, duration_min } = await request.json()
  if (!workout_type || !logged_date) {
    return NextResponse.json({ error: 'workout_type and logged_date are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workoutRaw, error } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, workout_type, title: title ?? null, logged_date, duration_min: duration_min ?? null } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const workout = workoutRaw as Workout
  return NextResponse.json({ workout }, { status: 201 })
}
