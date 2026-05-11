import { createClient } from '@/lib/supabase/server'
import { WhoopRings } from '@/components/dashboard/WhoopRings'
import { MacroBars } from '@/components/dashboard/MacroBars'
import { WeightSparkline } from '@/components/dashboard/WeightSparkline'
import { PhaseBadge } from '@/components/dashboard/PhaseBadge'
import { AISummaryCard } from '@/components/dashboard/AISummaryCard'
import Link from 'next/link'
import type { WhoopDaily, UserProfile, PhaseHistory, MealItem } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

  const whoopRes = await supabase.from('whoop_daily').select('*').eq('user_id', user.id).eq('cycle_date', today).maybeSingle()
  const weightRes = await supabase.from('weight_log').select('logged_date, weight_kg').eq('user_id', user.id).gte('logged_date', fourteenDaysAgo).order('logged_date', { ascending: true })
  const profileRes = await supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle()
  const phaseRes = await supabase.from('phase_history').select('*').eq('user_id', user.id).order('detected_at', { ascending: false }).limit(1).maybeSingle()
  const mealsRes = await supabase.from('meals').select('id').eq('user_id', user.id).eq('logged_date', today)

  const whoop = whoopRes.data as WhoopDaily | null
  const weights = (weightRes.data ?? []) as { logged_date: string; weight_kg: number }[]
  const profile = profileRes.data as UserProfile | null
  const phase = phaseRes.data as PhaseHistory | null
  const meals = (mealsRes.data ?? []) as { id: string }[]

  let macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  if (meals.length > 0) {
    const mealIds = meals.map((m) => m.id)
    const itemsRes = await supabase.from('meal_items').select('kcal, protein_g, carbs_g, fat_g').in('meal_id', mealIds)
    const items = (itemsRes.data ?? []) as Pick<MealItem, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]
    macros = items.reduce(
      (acc, item) => ({
        kcal: acc.kcal + item.kcal,
        protein_g: acc.protein_g + item.protein_g,
        carbs_g: acc.carbs_g + item.carbs_g,
        fat_g: acc.fat_g + item.fat_g,
      }),
      macros
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-neutral-400 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {phase && <PhaseBadge phase={phase.phase} confidence={phase.confidence ?? 0} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-4">Recovery</h2>
          <WhoopRings whoop={whoop} />
        </div>
        <AISummaryCard userId={user.id} today={today} />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-neutral-400 mb-4">Nutrition Today</h2>
        <MacroBars
          macros={macros}
          targets={{
            kcal: profile?.tdee_kcal ?? 2500,
            protein_g: profile?.protein_g ?? 180,
            carbs_g: profile?.carbs_g ?? 250,
            fat_g: profile?.fat_g ?? 70,
          }}
        />
      </div>

      {weights.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-4">Weight — 14 days</h2>
          <WeightSparkline data={weights} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/log/meals', label: 'Log Meal' },
          { href: '/log/workouts', label: 'Log Workout' },
          { href: '/log/weight', label: 'Log Weight' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 rounded-xl p-4 text-center text-sm font-medium text-neutral-300 hover:text-white transition-all"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
