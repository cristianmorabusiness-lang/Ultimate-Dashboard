import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectPhase, computeWeightTrend, computeCaloricDelta } from '@/lib/phase-detection'
import type { UserProfile, PhaseHistory } from '@/lib/database.types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Skip if auto-detected less than 23h ago
  const { data: last } = await supabase
    .from('phase_history').select('detected_at, source').eq('user_id', user.id)
    .eq('source', 'auto').order('detected_at', { ascending: false }).limit(1).maybeSingle()

  const lastData = last as Pick<PhaseHistory, 'detected_at' | 'source'> | null
  if (lastData && Date.now() - new Date(lastData.detected_at).getTime() < 23 * 3600000) {
    return NextResponse.json({ skipped: true })
  }

  const ago14 = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

  const [profileRes, weightRes, mealsRes] = await Promise.all([
    supabase.from('user_profile').select('tdee_kcal').eq('user_id', user.id).maybeSingle(),
    supabase.from('weight_log').select('weight_kg').eq('user_id', user.id)
      .gte('logged_date', ago14).order('logged_date', { ascending: true }),
    supabase.from('meals').select('id, logged_date').eq('user_id', user.id).gte('logged_date', ago14),
  ])

  const profile = profileRes.data as Pick<UserProfile, 'tdee_kcal'> | null
  const weights = ((weightRes.data ?? []) as { weight_kg: number }[]).map((w) => w.weight_kg)
  const meals = (mealsRes.data ?? []) as { id: string; logged_date: string }[]

  if (weights.length < 5 || !profile?.tdee_kcal) {
    return NextResponse.json({ skipped: true, reason: 'insufficient data' })
  }

  let dailyKcals: number[] = []
  if (meals.length > 0) {
    const { data: items } = await supabase
      .from('meal_items').select('kcal, meal_id').in('meal_id', meals.map((m) => m.id))
    const mealKcal = new Map<string, number>()
    ;(items ?? []).forEach((i: { kcal: number; meal_id: string }) =>
      mealKcal.set(i.meal_id, (mealKcal.get(i.meal_id) ?? 0) + i.kcal))
    const dayKcal = new Map<string, number>()
    meals.forEach((m) => dayKcal.set(m.logged_date, (dayKcal.get(m.logged_date) ?? 0) + (mealKcal.get(m.id) ?? 0)))
    dailyKcals = Array.from(dayKcal.values())
  }

  const weightTrend = computeWeightTrend(weights)
  const caloricDelta = dailyKcals.length > 0 ? computeCaloricDelta(dailyKcals, profile.tdee_kcal) : 0

  const result = detectPhase({ caloric_delta: caloricDelta, weight_trend_kg_wk: weightTrend, data_points: weights.length })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase.from('phase_history').insert({
    user_id: user.id, phase: result.phase,
    detected_at: new Date().toISOString().split('T')[0],
    confidence: result.confidence, detection_v: 2,
    caloric_delta: Math.round(caloricDelta),
    weight_trend: Math.round(weightTrend * 1000) / 1000,
    source: 'auto',
  } as any)

  return NextResponse.json({ phase: result.phase, confidence: result.confidence })
}
