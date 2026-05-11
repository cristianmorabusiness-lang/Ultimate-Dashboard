import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Workout, WorkoutSet } from '@/lib/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '60'), 100)

  const { data: workoutsRaw } = await supabase
    .from('workouts').select('*').eq('user_id', user.id)
    .order('logged_date', { ascending: false }).limit(limit)

  const workouts = (workoutsRaw ?? []) as Workout[]
  if (!workouts.length) return NextResponse.json({ workouts: [] })

  const { data: setsRaw } = await supabase
    .from('workout_sets').select('*')
    .in('workout_id', workouts.map((w) => w.id))
    .order('set_number', { ascending: true })

  const sets = (setsRaw ?? []) as WorkoutSet[]

  const result = workouts.map((w) => {
    const wSets = sets.filter((s) => s.workout_id === w.id)
    const volume = wSets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    return { ...w, sets: wSets, volume_kg: Math.round(volume) }
  })

  return NextResponse.json({ workouts: result })
}
