import { createClient } from '@/lib/supabase/server'
import { WhoopRings } from '@/components/dashboard/WhoopRings'
import { MacroBars } from '@/components/dashboard/MacroBars'
import { WeightSparkline } from '@/components/dashboard/WeightSparkline'
import { PhaseBadge } from '@/components/dashboard/PhaseBadge'
import { AISummaryCard } from '@/components/dashboard/AISummaryCard'
import Link from 'next/link'
import type { WhoopDaily, UserProfile, PhaseHistory, MealItem } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const QUICK_ACTIONS = [
  { href: '/log/meals', label: 'Pasto', icon: '🍽', desc: 'Logga un pasto' },
  { href: '/log/workouts', label: 'Workout', icon: '💪', desc: 'Logga un allenamento' },
  { href: '/log/weight', label: 'Peso', icon: '⚖️', desc: 'Registra il peso' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

  const [whoopRes, weightRes, profileRes, phaseRes, mealsRes] = await Promise.all([
    supabase.from('whoop_daily').select('*').eq('user_id', user.id).eq('cycle_date', today).maybeSingle(),
    supabase.from('weight_log').select('logged_date, weight_kg').eq('user_id', user.id).gte('logged_date', fourteenDaysAgo).order('logged_date', { ascending: true }),
    supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('phase_history').select('*').eq('user_id', user.id).order('detected_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('meals').select('id').eq('user_id', user.id).eq('logged_date', today),
  ])

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
    macros = items.reduce((acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }), macros)
  }

  const dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#f1eeff' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: '#6b5f8a' }}>{dateStr}</p>
        </div>
        {phase && <PhaseBadge phase={phase.phase} confidence={phase.confidence ?? 0} />}
      </div>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#4a4268' }}>
            Recovery · WHOOP
          </p>
          <WhoopRings whoop={whoop} />
        </div>
        <AISummaryCard userId={user.id} today={today} />
      </div>

      {/* Nutrition */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#4a4268' }}>
            Nutrizione Oggi
          </p>
          <Link href="/log/meals" className="text-[11px]" style={{ color: '#7c3aed' }}>
            + Aggiungi →
          </Link>
        </div>
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

      {/* Weight sparkline */}
      {weights.length > 0 && (
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#4a4268' }}>
            Peso — 14 giorni
          </p>
          <WeightSparkline data={weights} />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="group card p-3 md:p-4 text-center block transition-all">
            <div className="text-xl md:text-2xl mb-1 md:mb-1.5">{a.icon}</div>
            <p className="text-xs md:text-sm font-semibold" style={{ color: '#d8b4fe' }}>{a.label}</p>
            <p className="hidden sm:block text-[11px] mt-0.5" style={{ color: '#4a4268' }}>{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Mobile-only: links to Analytics & Weekly (not in bottom nav) */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {[
          { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
          { href: '/dashboard/weekly', label: 'Report', icon: '📋' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card p-3 text-center block">
            <div className="text-xl mb-1">{a.icon}</div>
            <p className="text-xs font-semibold" style={{ color: '#d8b4fe' }}>{a.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
