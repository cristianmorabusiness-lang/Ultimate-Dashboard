import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkoutSet } from '@/lib/database.types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workout_id, exercise_name, set_number, reps, weight_kg, duration_sec, rpe } = await request.json()
  if (!workout_id || !exercise_name || !set_number) {
    return NextResponse.json({ error: 'workout_id, exercise_name, set_number required' }, { status: 400 })
  }

  // Verify ownership
  const { data: workoutRaw } = await supabase.from('workouts').select('user_id').eq('id', workout_id).maybeSingle()
  const workout = workoutRaw as { user_id: string } | null
  if (!workout || workout.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: setRaw, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id,
      exercise_name,
      set_number,
      reps: reps ?? null,
      weight_kg: weight_kg ?? null,
      duration_sec: duration_sec ?? null,
      rpe: rpe ?? null,
    } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const set = setRaw as WorkoutSet
  return NextResponse.json({ set }, { status: 201 })
}
