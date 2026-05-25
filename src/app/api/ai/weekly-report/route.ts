import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PHASE_LABELS } from '@/lib/phase-detection'
import type { Phase, WhoopDaily, WeightLog, UserProfile, PhaseHistory, Meal, MealItem, Workout, WorkoutSet } from '@/lib/database.types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const WEEKLY_SYSTEM = `Sei un analista di performance e coach di natural bodybuilding. Ricevi una settimana completa di dati biometrici, allenamento e nutrizione e produci una sintesi settimanale strutturata. Sii analitico, cita numeri specifici, e mantieni ogni sezione concisa ma incisiva. Evita frasi di riempimento.

Formatta la risposta come testo semplice con queste sezioni (usa il prefisso ##):

## Recupero & HRV
## Nutrizione & Aderenza
## Carico di Allenamento
## Allineamento di Fase
## Priorità Settimana Prossima

Ogni sezione: 3-5 frasi. Totale: sotto le 600 parole. Rispondi in italiano.`

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getLastMonday()

  const { data: cached } = await supabase
    .from('ai_summaries')
    .select('*')
    .eq('user_id', user.id)
    .eq('summary_date', date)
    .eq('summary_type', 'weekly')
    .maybeSingle()

  return NextResponse.json({ summary: cached ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date } = await request.json()
  const weekStart = date ?? getLastMonday()
  const weekEnd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(new Date(weekStart).getTime() + 6 * 86400000))

  const [whoopRes, weightRes, profileRes, phaseRes, mealsRes, workoutRes] = await Promise.all([
    supabase.from('whoop_daily').select('*').eq('user_id', user.id).gte('cycle_date', weekStart).lte('cycle_date', weekEnd).order('cycle_date'),
    supabase.from('weight_log').select('logged_date, weight_kg, body_fat_pct').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd).order('logged_date'),
    supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('phase_history').select('*').eq('user_id', user.id).lte('detected_at', weekEnd).order('detected_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('meals').select('id, logged_date, meal_name').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd),
    supabase.from('workouts').select('*').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd).order('logged_date'),
  ])

  const whoop = (whoopRes.data ?? []) as WhoopDaily[]
  const weights = (weightRes.data ?? []) as Pick<WeightLog, 'logged_date' | 'weight_kg' | 'body_fat_pct'>[]
  const profile = profileRes.data as UserProfile | null
  const phase = phaseRes.data as PhaseHistory | null
  const mealsData = (mealsRes.data ?? []) as Pick<Meal, 'id' | 'logged_date' | 'meal_name'>[]
  const workouts = (workoutRes.data ?? []) as Workout[]

  // Fetch meal_items and workout_sets in parallel
  const mealIds = mealsData.map(m => m.id)
  const workoutIds = workouts.map(w => w.id)
  const [itemsRes, setsRes] = await Promise.all([
    mealIds.length > 0
      ? supabase.from('meal_items').select('meal_id, kcal, protein_g, carbs_g, fat_g, fiber_g').in('meal_id', mealIds)
      : Promise.resolve({ data: [] }),
    workoutIds.length > 0
      ? supabase.from('workout_sets').select('workout_id, exercise_name, set_number, reps, weight_kg, rpe').in('workout_id', workoutIds)
      : Promise.resolve({ data: [] }),
  ])
  const items = (itemsRes.data ?? []) as (Pick<MealItem, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g'> & { meal_id: string })[]
  const sets = (setsRes.data ?? []) as (Pick<WorkoutSet, 'exercise_name' | 'set_number' | 'reps' | 'weight_kg' | 'rpe'> & { workout_id: string })[]

  // Daily macro totals
  const itemsByMeal = items.reduce<Record<string, typeof items>>((acc, it) => {
    if (!acc[it.meal_id]) acc[it.meal_id] = []
    acc[it.meal_id]!.push(it)
    return acc
  }, {})
  const dailyMacros: Record<string, { kcal: number; p: number; c: number; f: number; fib: number }> = {}
  for (const m of mealsData) {
    if (!dailyMacros[m.logged_date]) dailyMacros[m.logged_date] = { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }
    for (const it of itemsByMeal[m.id] ?? []) {
      dailyMacros[m.logged_date]!.kcal += Number(it.kcal)
      dailyMacros[m.logged_date]!.p += Number(it.protein_g)
      dailyMacros[m.logged_date]!.c += Number(it.carbs_g)
      dailyMacros[m.logged_date]!.f += Number(it.fat_g)
      dailyMacros[m.logged_date]!.fib += Number(it.fiber_g ?? 0)
    }
  }
  const macroDays = Object.values(dailyMacros)
  const avgKcal = macroDays.length ? Math.round(macroDays.reduce((a, b) => a + b.kcal, 0) / macroDays.length) : 0
  const avgProtein = macroDays.length ? Math.round(macroDays.reduce((a, b) => a + b.p, 0) / macroDays.length) : 0
  const avgCarbs = macroDays.length ? Math.round(macroDays.reduce((a, b) => a + b.c, 0) / macroDays.length) : 0
  const avgFat = macroDays.length ? Math.round(macroDays.reduce((a, b) => a + b.f, 0) / macroDays.length) : 0

  const dailyMacroLines = Object.entries(dailyMacros).sort(([a], [b]) => a.localeCompare(b)).map(([d, m]) =>
    `- ${d}: ${Math.round(m.kcal)} kcal | P ${Math.round(m.p)}g | C ${Math.round(m.c)}g | F ${Math.round(m.f)}g`
  ).join('\n') || '- Nessun pasto'

  // Sets aggregation
  const setsByWorkout = sets.reduce<Record<string, typeof sets>>((acc, s) => {
    if (!acc[s.workout_id]) acc[s.workout_id] = []
    acc[s.workout_id]!.push(s)
    return acc
  }, {})
  const workoutLines = workouts.map(w => {
    const ws = setsByWorkout[w.id] ?? []
    const byExercise = ws.reduce<Record<string, typeof ws>>((acc, s) => {
      if (!acc[s.exercise_name]) acc[s.exercise_name] = []
      acc[s.exercise_name]!.push(s)
      return acc
    }, {})
    const exSummary = Object.entries(byExercise).map(([ex, sx]) => {
      const topWeight = Math.max(...sx.map(s => Number(s.weight_kg) || 0))
      const totalReps = sx.reduce((a, s) => a + (s.reps ?? 0), 0)
      return `${ex} ${sx.length}×${totalReps}r${topWeight ? ` top ${topWeight}kg` : ''}`
    }).join(' | ')
    return `- ${w.logged_date} ${w.title ?? w.workout_type}${w.duration_min ? ` (${w.duration_min}min)` : ''}${exSummary ? ` :: ${exSummary}` : ''}`
  }).join('\n') || '- Nessun allenamento'

  // WHOOP averages
  const avgRecovery = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.recovery_score ?? 0), 0) / whoop.length) : null
  const avgHRV = whoop.length ? Math.round(whoop.reduce((a, b) => a + Number(b.hrv_rmssd_ms ?? 0), 0) / whoop.length * 10) / 10 : null
  const avgSleep = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.sleep_duration_min ?? 0), 0) / whoop.length / 60 * 10) / 10 : null
  const avgStrain = whoop.length ? Math.round(whoop.reduce((a, b) => a + Number(b.day_strain ?? 0), 0) / whoop.length * 10) / 10 : null

  const whoopLines = whoop.map(w =>
    `- ${w.cycle_date}: Rec ${w.recovery_score ?? 'N/D'}% | HRV ${w.hrv_rmssd_ms ?? 'N/D'}ms | Sonno ${w.sleep_duration_min != null ? `${Math.round(w.sleep_duration_min / 60 * 10) / 10}h` : 'N/D'} | Strain ${w.day_strain ?? 'N/D'}`
  ).join('\n') || '- Nessun dato WHOOP'

  const weightStart = weights[0]?.weight_kg
  const weightEnd = weights[weights.length - 1]?.weight_kg
  const weightChange = weightStart != null && weightEnd != null ? Math.round((Number(weightEnd) - Number(weightStart)) * 100) / 100 : null

  const context = `Settimana: ${weekStart} → ${weekEnd}
Fase attuale: ${phase ? PHASE_LABELS[phase.phase as Phase] : 'sconosciuta'} (conf ${phase ? Math.round((phase.confidence ?? 0) * 100) : 0}%)
Target profilo: TDEE ${profile?.tdee_kcal ?? 'N/D'} kcal | P ${profile?.protein_g ?? 'N/D'}g | C ${profile?.carbs_g ?? 'N/D'}g | F ${profile?.fat_g ?? 'N/D'}g

WHOOP (${whoop.length}/7 giorni):
- Recovery medio: ${avgRecovery ?? 'N/D'}%
- HRV medio: ${avgHRV ?? 'N/D'} ms
- Sonno medio: ${avgSleep ?? 'N/D'} h
- Strain medio: ${avgStrain ?? 'N/D'}
Dettaglio giornaliero:
${whoopLines}

PESO (${weights.length} pesate):
- Inizio: ${weightStart ?? 'N/D'} kg
- Fine: ${weightEnd ?? 'N/D'} kg
- Variazione: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : 'N/D'}

NUTRIZIONE (${Object.keys(dailyMacros).length}/7 giorni con pasti):
- Medie giornaliere: ${avgKcal} kcal | P ${avgProtein}g | C ${avgCarbs}g | F ${avgFat}g
- vs target: kcal ${profile?.tdee_kcal ? `${avgKcal - profile.tdee_kcal > 0 ? '+' : ''}${avgKcal - profile.tdee_kcal}` : 'N/D'}, P ${profile?.protein_g ? `${avgProtein - profile.protein_g > 0 ? '+' : ''}${avgProtein - profile.protein_g}g` : 'N/D'}
Dettaglio giornaliero:
${dailyMacroLines}

ALLENAMENTI (${workouts.length} sessioni):
${workoutLines}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1200,
      system: [
        {
          type: 'text',
          text: WEEKLY_SYSTEM,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: context }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stored } = await supabase
      .from('ai_summaries')
      .upsert(
        {
          user_id: user.id,
          summary_date: weekStart,
          summary_type: 'weekly',
          model_used: 'claude-opus-4-7',
          prompt_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          content,
        } as any,
        { onConflict: 'user_id,summary_date,summary_type' }
      )
      .select()
      .single()

    return NextResponse.json({ summary: stored })
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any
    const status: number = typeof anyErr?.status === 'number' ? anyErr.status : 503
    const apiMessage: string | undefined =
      anyErr?.error?.error?.message ??
      anyErr?.error?.message ??
      (err instanceof Error ? err.message : undefined)
    const detail = apiMessage ?? 'Errore sconosciuto'
    console.error('AI weekly report error:', status, detail, anyErr?.error ?? '')
    return NextResponse.json(
      { error: `AI error (${status}): ${detail}` },
      { status: status >= 400 && status < 600 ? status : 503 }
    )
  }
}

function getLastMonday(): string {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date())
  const dayMap: Record<string, number> = { Sunday: 6, Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 }
  const daysBack = dayMap[weekday] ?? 0
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(Date.now() - daysBack * 86400000))
}
