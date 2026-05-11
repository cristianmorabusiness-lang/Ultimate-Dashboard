import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeWeightTrend, computeCaloricDelta, detectPhase } from '@/lib/phase-detection'
import type { WeightLog, UserProfile, Meal } from '@/lib/database.types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entriesRaw } = await supabase
    .from('weight_log')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_date', { ascending: false })
    .limit(30)

  const entries = (entriesRaw ?? []) as WeightLog[]
  return NextResponse.json({ entries })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weight_kg, body_fat_pct, note, logged_date } = await request.json()
  if (!weight_kg || !logged_date) {
    return NextResponse.json({ error: 'weight_kg and logged_date are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('weight_log').upsert(
    { user_id: user.id, logged_date, weight_kg, body_fat_pct: body_fat_pct ?? null, note: note ?? null } as any,
    { onConflict: 'user_id,logged_date' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Run phase detection after every weight entry
  await runPhaseDetection(supabase, user.id)

  return NextResponse.json({ ok: true })
}

async function runPhaseDetection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const weightRes = await supabase.from('weight_log').select('weight_kg').eq('user_id', userId).gte('logged_date', fourteenDaysAgo).order('logged_date', { ascending: true })
  const profileRes = await supabase.from('user_profile').select('tdee_kcal').eq('user_id', userId).maybeSingle()
  const mealsRes = await supabase.from('meals').select('id').eq('user_id', userId).gte('logged_date', fourteenDaysAgo)

  const weightsRaw = (weightRes.data ?? []) as Pick<WeightLog, 'weight_kg'>[]
  const profileData = profileRes.data as Pick<UserProfile, 'tdee_kcal'> | null
  const mealsData = (mealsRes.data ?? []) as Pick<Meal, 'id'>[]

  const weights = weightsRaw.map((w) => w.weight_kg)
  const tdee = profileData?.tdee_kcal ?? 2500

  let dailyKcal: number[] = []
  if (mealsData.length > 0) {
    const mealIds = mealsData.map((m) => m.id)
    const { data: itemsRaw } = await supabase.from('meal_items').select('meal_id, kcal').in('meal_id', mealIds)
    const items = (itemsRaw ?? []) as { meal_id: string; kcal: number }[]
    const byMeal = new Map<string, number>()
    items.forEach((item) => { byMeal.set(item.meal_id, (byMeal.get(item.meal_id) ?? 0) + item.kcal) })
    dailyKcal = Array.from(byMeal.values())
  }

  const trend = computeWeightTrend(weights)
  const caloricDelta = computeCaloricDelta(dailyKcal, tdee)
  const result = detectPhase({ caloric_delta: caloricDelta, weight_trend_kg_wk: trend, data_points: Math.min(weights.length, dailyKcal.length || weights.length) })

  if (result.confidence < 0.4) return

  // Only insert if phase changed or no recent entry
  const { data: lastPhaseRaw } = await supabase.from('phase_history').select('phase').eq('user_id', userId).order('detected_at', { ascending: false }).limit(1).maybeSingle()
  const lastPhase = lastPhaseRaw as { phase: string } | null

  if (!lastPhase || lastPhase.phase !== result.phase) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('phase_history').insert({
      user_id: userId,
      phase: result.phase,
      detected_at: today,
      confidence: result.confidence,
      detection_v: 2,
      caloric_delta: Math.round(caloricDelta),
      weight_trend: Math.round(trend * 100) / 100,
      source: 'auto',
    } as any)
  }
}
