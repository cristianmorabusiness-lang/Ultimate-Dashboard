import { createClient } from '@/lib/supabase/server'
import { WhoopRings } from '@/components/dashboard/WhoopRings'
import { MacroBars } from '@/components/dashboard/MacroBars'
import { WeightSparkline } from '@/components/dashboard/WeightSparkline'
import { PhaseBadge } from '@/components/dashboard/PhaseBadge'
import { AISummaryCard } from '@/components/dashboard/AISummaryCard'
import { PhaseDetectTrigger } from '@/components/dashboard/PhaseDetectTrigger'
import { WhoopSyncButton } from '@/components/dashboard/WhoopSyncButton'
import Link from 'next/link'
import type { WhoopDaily, UserProfile, PhaseHistory, MealItem } from '@/lib/database.types'
import { localDate, daysAgo } from '@/lib/date'

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

  const today = localDate()
  const fourteenDaysAgo = daysAgo(14)

  const yesterday = daysAgo(1)
  const [whoopRes, weightRes, profileRes, phaseRes, mealsRes] = await Promise.all([
    supabase.from('whoop_daily').select('*').eq('user_id', user.id)
      .in('cycle_date', [today, yesterday])
      .order('cycle_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
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
  const tdee = profile?.tdee_kcal ?? 0
  const caloricBalance = tdee > 0 ? Math.round(macros.kcal - tdee) : null
  const balancePct = tdee > 0 ? Math.min(Math.round((macros.kcal / tdee) * 100), 150) : 0

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-5">
      <PhaseDetectTrigger />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {phase && <PhaseBadge phase={phase.phase} confidence={phase.confidence ?? 0} />}
          <WhoopSyncButton lastSyncedAt={whoop?.synced_at ?? null} />
        </div>
      </div>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-label mb-4">Recovery · WHOOP</p>
          <WhoopRings whoop={whoop} />
        </div>
        <AISummaryCard userId={user.id} today={today} />
      </div>

      {/* Nutrition */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Nutrizione Oggi</p>
          <Link href="/log/meals" className="text-[11px] font-semibold transition-colors"
            style={{ color: 'var(--accent)' }}>
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

      {/* Caloric Balance */}
      {caloricBalance !== null && (() => {
        const balanceColor = caloricBalance < -100 ? 'var(--info)'
          : caloricBalance > 100 ? 'var(--warning)'
          : 'var(--success)'
        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Bilancio Calorico Oggi</p>
              <span className="font-mono text-sm font-bold" style={{ color: balanceColor }}>
                {caloricBalance > 0 ? '+' : ''}{caloricBalance} kcal
              </span>
            </div>

            <div className="flex items-end gap-3 mb-3">
              <div>
                <p className="font-mono text-2xl font-bold" style={{ color: 'var(--text)' }}>{Math.round(macros.kcal)}</p>
                <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>consumate</p>
              </div>
              <div className="flex-1 flex items-center justify-center pb-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {tdee} target</span>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-semibold" style={{ color: balanceColor }}>
                  {caloricBalance < 0 ? 'Deficit' : caloricBalance > 0 ? 'Surplus' : 'Pari'}
                </p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {Math.abs(caloricBalance)} kcal
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(balancePct, 100)}%`,
                  background: balanceColor,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>0 kcal</span>
              <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>{balancePct}% del target</span>
              <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>{tdee} kcal</span>
            </div>
          </div>
        )
      })()}

      {/* Weight sparkline */}
      {weights.length > 0 && (
        <div className="card p-5">
          <p className="section-label mb-4">Peso — 14 giorni</p>
          <WeightSparkline data={weights} />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="group card p-3 md:p-4 text-center block transition-all">
            <div className="text-xl md:text-2xl mb-1 md:mb-1.5">{a.icon}</div>
            <p className="text-xs md:text-sm font-semibold" style={{ color: 'var(--text)' }}>{a.label}</p>
            <p className="hidden sm:block text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>
          </Link>
        ))}
      </div>

    </div>
  )
}
