import { createClient } from '@/lib/supabase/server'
import { HRVChart } from '@/components/charts/HRVChart'
import { WeightTrendChart } from '@/components/charts/WeightTrendChart'
import { CalorieChart } from '@/components/charts/CalorieChart'
import type { WhoopDaily, WeightLog, UserProfile, Meal } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [whoopRes, weightRes, profileRes, mealsRes] = await Promise.all([
    supabase.from('whoop_daily').select('cycle_date, hrv_rmssd_ms, recovery_score, sleep_performance, day_strain').eq('user_id', user.id).gte('cycle_date', thirtyDaysAgo).order('cycle_date', { ascending: true }),
    supabase.from('weight_log').select('logged_date, weight_kg').eq('user_id', user.id).gte('logged_date', thirtyDaysAgo).order('logged_date', { ascending: true }),
    supabase.from('user_profile').select('tdee_kcal').eq('user_id', user.id).maybeSingle(),
    supabase.from('meals').select('id, logged_date').eq('user_id', user.id).gte('logged_date', thirtyDaysAgo),
  ])

  const whoop = (whoopRes.data ?? []) as Pick<WhoopDaily, 'cycle_date' | 'hrv_rmssd_ms' | 'recovery_score' | 'sleep_performance' | 'day_strain'>[]
  const weights = (weightRes.data ?? []) as Pick<WeightLog, 'logged_date' | 'weight_kg'>[]
  const tdee = (profileRes.data as Pick<UserProfile, 'tdee_kcal'> | null)?.tdee_kcal ?? 2500
  const meals = (mealsRes.data ?? []) as Pick<Meal, 'id' | 'logged_date'>[]

  let dailyKcal: { date: string; kcal: number }[] = []
  if (meals.length > 0) {
    const mealIds = meals.map((m) => m.id)
    const { data: itemsRaw } = await supabase.from('meal_items').select('meal_id, kcal').in('meal_id', mealIds)
    const items = (itemsRaw ?? []) as { meal_id: string; kcal: number }[]
    const byMeal = new Map<string, number>()
    items.forEach((item) => byMeal.set(item.meal_id, (byMeal.get(item.meal_id) ?? 0) + item.kcal))
    const byDate = new Map<string, number>()
    meals.forEach((meal) => byDate.set(meal.logged_date, (byDate.get(meal.logged_date) ?? 0) + (byMeal.get(meal.id) ?? 0)))
    dailyKcal = Array.from(byDate.entries())
      .map(([date, kcal]) => ({ date, kcal: Math.round(kcal) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const isEmpty = whoop.length === 0 && weights.length === 0 && dailyKcal.length === 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Ultimi 30 giorni</p>
      </div>

      {whoop.length > 0 && (
        <div className="card p-5">
          <HRVChart data={whoop} />
        </div>
      )}

      {weights.length > 0 && (
        <div className="card p-5">
          <p className="section-label mb-4">Andamento Peso</p>
          <WeightTrendChart data={weights} />
        </div>
      )}

      {dailyKcal.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Calorie Giornaliere</p>
            <span className="font-mono text-xs" style={{ color: '#8b7faa' }}>
              Target: {tdee.toLocaleString()} kcal
            </span>
          </div>
          <CalorieChart data={dailyKcal} tdee={tdee} />
        </div>
      )}

      {isEmpty && (
        <div className="card p-16 text-center">
          <p className="text-base" style={{ color: '#8b7faa' }}>Nessun dato ancora.</p>
          <p className="text-sm mt-1" style={{ color: '#5e5479' }}>Inizia a loggare pasti, peso e sincronizza WHOOP.</p>
        </div>
      )}
    </div>
  )
}
