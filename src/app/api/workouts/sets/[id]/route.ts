import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, WorkoutSet } from '@/lib/database.types'

type WorkoutSetUpdate = Database['public']['Tables']['workout_sets']['Update']

async function verifyOwnership(setId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workout_sets')
    .select('id, workout_id, workouts!inner(user_id)')
    .eq('id', setId)
    .maybeSingle()
  const row = data as { id: string; workout_id: string; workouts: { user_id: string } } | null
  if (!row || row.workouts.user_id !== userId) return null
  return row
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await verifyOwnership(id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const patch: WorkoutSetUpdate = {}
  if ('exercise_name' in body) {
    const name = typeof body.exercise_name === 'string' ? body.exercise_name.trim() : ''
    if (!name) return NextResponse.json({ error: 'exercise_name cannot be empty' }, { status: 400 })
    patch.exercise_name = name
  }
  if ('reps' in body) patch.reps = body.reps === '' || body.reps == null ? null : Number(body.reps)
  if ('weight_kg' in body) patch.weight_kg = body.weight_kg === '' || body.weight_kg == null ? null : Number(body.weight_kg)
  if ('rpe' in body) patch.rpe = body.rpe === '' || body.rpe == null ? null : Number(body.rpe)
  if ('duration_sec' in body) patch.duration_sec = body.duration_sec === '' || body.duration_sec == null ? null : Number(body.duration_sec)
  if ('set_number' in body) patch.set_number = Number(body.set_number)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from('workout_sets') as any
  const { data: updated, error } = await table
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ set: updated as WorkoutSet })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await verifyOwnership(id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('workout_sets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
