import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/database.types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileRaw } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const profile = profileRaw as UserProfile | null
  return NextResponse.json({ profile })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { height_cm, birth_date, sex, goal_phase, tdee_kcal, protein_g, carbs_g, fat_g, wake_time, workout_start, workout_end } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('user_profile').upsert(
    {
      user_id: user.id,
      height_cm,
      birth_date,
      sex,
      goal_phase: goal_phase || null,
      tdee_kcal: tdee_kcal || null,
      protein_g: protein_g || null,
      carbs_g: carbs_g || null,
      fat_g: fat_g || null,
      wake_time: wake_time || null,
      workout_start: workout_start || null,
      workout_end: workout_end || null,
      updated_at: new Date().toISOString(),
    } as any,
    { onConflict: 'user_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
