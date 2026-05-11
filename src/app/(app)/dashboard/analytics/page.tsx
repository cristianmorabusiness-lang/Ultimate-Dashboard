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

  const whoopRes = await supabase.from('whoop_daily').select('cycle_date, hrv_rmssd_ms, recovery_score, sleep_performance, day_strain').eq('user_id', user.id).gte('cycle_date', thirtyDaysAgo).order('cycle_date', { ascending: true })
  const weightRes = await supabase.from('weight_log').select('logged_date, weight_kg').eq('user_id', user.id).gte('logged_date', thirtyDaysAgo).order('logged_date', { ascending: true })
  const profileRes = await supabase.from('user_profile').select('tdee_kcal').eq('user_id', user.id).maybeSingle()

  const whoop = (whoopRes.data ?? []) as Pick<WhoopDaily, 'cycle_date' | 'hrv_rmssd_ms' | 'recovery_score' | 'sleep_performance' | 'day_strain'>[]
  const weights = (weightRes.data ?? []) as Pick<WeightLog, 'logged_date' | 'weight_kg'>[]
  const tdee = (profileRes.data as Pick<UserProfile, 'tdee_kcal'> | null)?.tdee_kcal ?? 2500

  // Build daily caloric totals for last 30 days
  const { data: mealsRaw } = await supabase.from('meals').select('id, logged_date').eq('user_id', user.id).gte('logged_date', thirtyDaysAgo)
  const meals = (mealsRaw ?? []) as Pick<Meal, 'id' | 'logged_date'>[]

  let dailyKcal: { date: string; kcal: number }[] = []
  if (meals.length > 0) {
    const mealIds = meals.map((m) => m.id)
    const { data: itemsRaw } = await supabase.from('meal_items').select('meal_id, kcal').in('meal_id', mealIds)
    const items = (itemsRaw ?? []) as { meal_id: string; kcal: number }[]
    const byMeal = new Map<string, number>()
    items.forEach((item) => {
      byMeal.set(item.meal_id, (byMeal.get(item.meal_id) ?? 0) + item.kcal)
    })
    const byDate = new Map<string, number>()
    meals.forEach((meal) => {
      byDate.set(meal.logged_date, (byDate.get(meal.logged_date) ?? 0) + (byMeal.get(meal.id) ?? 0))
    })
    dailyKcal = Array.from(byDate.entries())
      .map(([date, kcal]) => ({ date, kcal: Math.round(kcal) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="text-neutral-400 text-sm">Last 30 days</p>
      </div>

      {whoop.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-4">HRV & Recovery</h2>
          <HRVChart data={whoop} />
        </div>
      )}

      {weights.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-4">Weight Trend</h2>
          <WeightTrendChart data={weights} />
        </div>
      )}

      {dailyKcal.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-1">Daily Calories</h2>
          <p className="text-xs text-neutral-500 mb-4">Target: {tdee.toLocaleString()} kcal</p>
          <CalorieChart data={dailyKcal} tdee={tdee} />
        </div>
      )}

      {whoop.length === 0 && weights.length === 0 && dailyKcal.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <p className="text-neutral-400">No data yet. Start logging meals, weight, and syncing WHOOP data.</p>
        </div>
      )}
    </div>
  )
}
