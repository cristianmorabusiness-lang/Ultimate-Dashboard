import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PHASE_LABELS } from '@/lib/phase-detection'
import type { Phase, PhaseHistory, UserProfile, WeightLog, Workout, WorkoutSet, WhoopDaily } from '@/lib/database.types'
import { daysAgo, localDate } from '@/lib/date'

type ProfileLite = Pick<UserProfile, 'height_cm' | 'birth_date' | 'sex' | 'goal_phase' | 'tdee_kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'wake_time' | 'workout_start' | 'workout_end'>
type PhaseLite = Pick<PhaseHistory, 'phase' | 'confidence' | 'caloric_delta' | 'weight_trend' | 'detected_at' | 'source'>
type WeightLite = Pick<WeightLog, 'logged_date' | 'weight_kg' | 'body_fat_pct' | 'note'>
type WorkoutLite = Pick<Workout, 'id' | 'logged_date' | 'workout_type' | 'title' | 'duration_min' | 'notes'>
type WorkoutSetLite = Pick<WorkoutSet, 'workout_id' | 'exercise_name' | 'set_number' | 'reps' | 'weight_kg' | 'duration_sec' | 'rpe'>
type WhoopLite = Pick<WhoopDaily, 'cycle_date' | 'recovery_score' | 'hrv_rmssd_ms' | 'resting_hr_bpm' | 'sleep_performance' | 'sleep_duration_min' | 'sleep_disturbances' | 'day_strain' | 'energy_burnt_kcal'>
type MealItemLite = { food_name: string; quantity_g: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null }
type MealLite = { id: string; logged_date: string; meal_name: string; meal_order: number; notes: string | null; meal_items: MealItemLite[] }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_BASE = `Sei un coach di natural bodybuilding e nutrizione sportiva altamente qualificato. Hai accesso completo alla storia di allenamento, peso, nutrizione e recupero dell'utente, inclusi tutti i dati registrati nella dashboard.

Caratteristiche del tuo approccio:
- Rispondi in italiano, in modo diretto e concreto
- Citi numeri specifici dalla storia dell'utente quando pertinenti (peso, kcal, macro, recupero, HRV, sonno, RPE, carichi)
- Dai consigli pratici e applicabili immediatamente
- Non ripeti informazioni ovvie o generiche
- Mantieni le risposte concise (max 250 parole) a meno che non sia necessario più dettaglio
- Sei proattivo: se noti qualcosa di rilevante nei dati, lo segnali spontaneamente
- Se l'utente chiede dati specifici (es. "quanto pesavo ieri", "quanti carb ho mangiato lunedì"), usa i dati nel contesto per rispondere con precisione`

function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function round(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return 'N/D'
  const f = Math.pow(10, decimals)
  return String(Math.round(n * f) / f)
}

function signed(n: number | null | undefined, decimals = 1, suffix = ''): string {
  if (n == null || isNaN(n)) return 'N/D'
  const f = Math.pow(10, decimals)
  const v = Math.round(n * f) / f
  return `${v > 0 ? '+' : ''}${v}${suffix}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const today = localDate()
  const ago7 = daysAgo(7)
  const ago14 = daysAgo(14)
  const ago30 = daysAgo(30)

  const [
    profileRes,
    phaseRes,
    weightRes,
    workoutRes,
    mealRes,
    whoopRes,
  ] = await Promise.all([
    supabase.from('user_profile')
      .select('height_cm, birth_date, sex, goal_phase, tdee_kcal, protein_g, carbs_g, fat_g, wake_time, workout_start, workout_end')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('phase_history')
      .select('phase, confidence, caloric_delta, weight_trend, detected_at, source')
      .eq('user_id', user.id).order('detected_at', { ascending: false }).limit(3),
    supabase.from('weight_log')
      .select('logged_date, weight_kg, body_fat_pct, note')
      .eq('user_id', user.id).gte('logged_date', ago30).order('logged_date', { ascending: false }),
    supabase.from('workouts')
      .select('id, logged_date, workout_type, title, duration_min, notes')
      .eq('user_id', user.id).gte('logged_date', ago14).order('logged_date', { ascending: false }),
    supabase.from('meals')
      .select('id, logged_date, meal_name, meal_order, notes, meal_items(food_name, quantity_g, kcal, protein_g, carbs_g, fat_g, fiber_g)')
      .eq('user_id', user.id).gte('logged_date', ago7).order('logged_date', { ascending: false }).order('meal_order', { ascending: true }),
    supabase.from('whoop_daily')
      .select('cycle_date, recovery_score, hrv_rmssd_ms, resting_hr_bpm, sleep_performance, sleep_duration_min, sleep_disturbances, day_strain, energy_burnt_kcal')
      .eq('user_id', user.id).gte('cycle_date', ago14).order('cycle_date', { ascending: false }),
  ])

  const profile = profileRes.data as ProfileLite | null
  const phases = (phaseRes.data ?? []) as PhaseLite[]
  const weights = (weightRes.data ?? []) as WeightLite[]
  const workouts = (workoutRes.data ?? []) as WorkoutLite[]
  const meals = (mealRes.data ?? []) as MealLite[]
  const whoop = (whoopRes.data ?? []) as WhoopLite[]

  // Fetch sets for last 14d workouts
  const workoutIds = workouts.map(w => w.id)
  const setsRes = workoutIds.length > 0
    ? await supabase.from('workout_sets')
        .select('workout_id, exercise_name, set_number, reps, weight_kg, duration_sec, rpe')
        .in('workout_id', workoutIds).order('set_number', { ascending: true })
    : { data: [] }
  const sets = (setsRes.data ?? []) as WorkoutSetLite[]
  const setsByWorkout = sets.reduce<Record<string, WorkoutSetLite[]>>((acc, s) => {
    if (!acc[s.workout_id]) acc[s.workout_id] = []
    acc[s.workout_id]!.push(s)
    return acc
  }, {})

  // --- DERIVED METRICS ---
  const age = ageFromBirthDate(profile?.birth_date)
  const latestWeight = weights[0]?.weight_kg
  const oldestWeight = weights[weights.length - 1]?.weight_kg
  const weightDelta = latestWeight != null && oldestWeight != null ? latestWeight - oldestWeight : null
  const latestBodyFat = weights.find(w => w.body_fat_pct != null)?.body_fat_pct

  // Daily macro aggregation (last 7d)
  const dailyMacros = meals.reduce<Record<string, { kcal: number; protein: number; carbs: number; fat: number; fiber: number; meals: number }>>((acc, m) => {
    if (!acc[m.logged_date]) acc[m.logged_date] = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }
    acc[m.logged_date]!.meals++
    for (const item of m.meal_items ?? []) {
      acc[m.logged_date]!.kcal += item.kcal
      acc[m.logged_date]!.protein += item.protein_g
      acc[m.logged_date]!.carbs += item.carbs_g
      acc[m.logged_date]!.fat += item.fat_g
      acc[m.logged_date]!.fiber += item.fiber_g ?? 0
    }
    return acc
  }, {})

  // WHOOP averages (last 7d for trend)
  const whoop7 = whoop.slice(0, 7)
  const avg = (arr: number[]) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length
  const avgRecovery = avg(whoop7.map(w => w.recovery_score).filter((n): n is number => n != null))
  const avgHrv = avg(whoop7.map(w => w.hrv_rmssd_ms).filter((n): n is number => n != null))
  const avgSleepMin = avg(whoop7.map(w => w.sleep_duration_min).filter((n): n is number => n != null))
  const avgStrain = avg(whoop7.map(w => w.day_strain).filter((n): n is number => n != null))
  const todayWhoop = whoop[0]

  // Workout type counts (14d)
  const sessionCounts = workouts.reduce<Record<string, number>>((acc, w) => {
    const key = w.title ?? w.workout_type
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  // --- BUILD CONTEXT ---
  const phaseLatest = phases[0]
  const profileLine = profile
    ? `${profile.sex ?? 'N/D'}, ${age ?? 'N/D'} anni, ${profile.height_cm ?? 'N/D'} cm`
    : 'Profilo non impostato'

  const phaseHistoryLines = phases.length === 0
    ? '- Nessuna fase rilevata'
    : phases.map(p => `- ${p.detected_at}: ${PHASE_LABELS[p.phase as Phase]} (conf ${Math.round((p.confidence ?? 0) * 100)}%, delta ${signed(p.caloric_delta, 0, ' kcal')}, trend ${signed(p.weight_trend, 2, ' kg/sett')}, ${p.source})`).join('\n')

  const weightLines = weights.length === 0
    ? '- Nessuna pesata registrata'
    : weights.slice(0, 30).map(w => `- ${w.logged_date}: ${w.weight_kg} kg${w.body_fat_pct != null ? ` (BF ${w.body_fat_pct}%)` : ''}${w.note ? ` — ${w.note}` : ''}`).join('\n')

  const macroLines = Object.keys(dailyMacros).length === 0
    ? '- Nessun pasto registrato'
    : Object.entries(dailyMacros).sort(([a], [b]) => b.localeCompare(a)).map(([date, m]) =>
        `- ${date}: ${Math.round(m.kcal)} kcal | P ${Math.round(m.protein)}g | C ${Math.round(m.carbs)}g | F ${Math.round(m.fat)}g | Fib ${Math.round(m.fiber)}g (${m.meals} pasti)`
      ).join('\n')

  // Today's meals detail
  const todayMeals = meals.filter(m => m.logged_date === today)
  const todayMealLines = todayMeals.length === 0
    ? 'Nessun pasto registrato oggi'
    : todayMeals.map(m => {
        const items = (m.meal_items ?? []).map(i =>
          `    · ${i.food_name} ${i.quantity_g}g (${Math.round(i.kcal)} kcal, P${round(i.protein_g, 0)}/C${round(i.carbs_g, 0)}/F${round(i.fat_g, 0)})`
        ).join('\n')
        return `  ${m.meal_name}${m.notes ? ` [${m.notes}]` : ''}:\n${items || '    (vuoto)'}`
      }).join('\n')

  const workoutLines = workouts.length === 0
    ? '- Nessun allenamento registrato'
    : workouts.map(w => {
        const sets = setsByWorkout[w.id] ?? []
        // Group sets by exercise for compact display
        const byExercise = sets.reduce<Record<string, typeof sets>>((acc, s) => {
          if (!acc[s.exercise_name]) acc[s.exercise_name] = []
          acc[s.exercise_name]!.push(s)
          return acc
        }, {})
        const exLines = Object.entries(byExercise).map(([ex, ss]) => {
          const summary = ss.map(s => {
            const parts: string[] = []
            if (s.reps != null) parts.push(`${s.reps}r`)
            if (s.weight_kg != null) parts.push(`${s.weight_kg}kg`)
            if (s.duration_sec != null) parts.push(`${s.duration_sec}s`)
            if (s.rpe != null) parts.push(`RPE${s.rpe}`)
            return parts.join('×') || '-'
          }).join(', ')
          return `    · ${ex}: ${summary}`
        }).join('\n')
        return `- ${w.logged_date} ${w.title ?? w.workout_type}${w.duration_min ? ` (${w.duration_min}min)` : ''}${w.notes ? ` — ${w.notes}` : ''}${exLines ? `\n${exLines}` : ''}`
      }).join('\n')

  const whoopLines = whoop.length === 0
    ? '- Nessun dato WHOOP'
    : whoop.slice(0, 14).map(w =>
        `- ${w.cycle_date}: Rec ${w.recovery_score ?? 'N/D'}% | HRV ${w.hrv_rmssd_ms ?? 'N/D'}ms | RHR ${w.resting_hr_bpm ?? 'N/D'} | Sonno ${w.sleep_duration_min != null ? `${Math.round(w.sleep_duration_min / 60 * 10) / 10}h` : 'N/D'} (perf ${w.sleep_performance ?? 'N/D'}%) | Strain ${w.day_strain ?? 'N/D'}`
      ).join('\n')

  const context = `--- CONTESTO UTENTE COMPLETO (aggiornato al ${today}) ---

PROFILO:
- Fisico: ${profileLine}
- Fase obiettivo: ${profile?.goal_phase ?? 'non impostata'}
- TDEE: ${profile?.tdee_kcal ?? 'N/D'} kcal
- Target macro: P ${profile?.protein_g ?? 'N/D'}g | C ${profile?.carbs_g ?? 'N/D'}g | F ${profile?.fat_g ?? 'N/D'}g
- Orari: sveglia ${profile?.wake_time ?? 'N/D'}, allenamento ${profile?.workout_start ?? 'N/D'}–${profile?.workout_end ?? 'N/D'}

FASE ATTUALE: ${phaseLatest ? PHASE_LABELS[phaseLatest.phase as Phase] : 'non rilevata'} (conf ${phaseLatest ? Math.round((phaseLatest.confidence ?? 0) * 100) : 0}%)
- Delta calorico stimato: ${signed(phaseLatest?.caloric_delta, 0, ' kcal/giorno vs TDEE')}
- Trend peso: ${signed(phaseLatest?.weight_trend, 2, ' kg/settimana')}

STORICO FASI (ultime 3 rilevazioni):
${phaseHistoryLines}

PESO (ultimi 30 giorni, ${weights.length} pesate):
- Attuale: ${latestWeight ?? 'N/D'} kg
- 30gg fa: ${oldestWeight ?? 'N/D'} kg
- Variazione: ${weightDelta != null ? signed(weightDelta, 2, ' kg') : 'N/D'}
- BF% più recente: ${latestBodyFat != null ? `${latestBodyFat}%` : 'N/D'}
Dettaglio pesate:
${weightLines}

NUTRIZIONE (totali giornalieri ultimi 7 giorni):
${macroLines}

PASTI DI OGGI (${today}):
${todayMealLines}

ALLENAMENTI (ultimi 14 giorni, ${workouts.length} sessioni):
Riepilogo per tipo:
${Object.entries(sessionCounts).map(([k, v]) => `- ${k}: ${v}x`).join('\n') || '- Nessuna sessione'}
Dettaglio sessioni:
${workoutLines}

RECUPERO WHOOP (ultimi 14 giorni):
Medie 7gg: Recovery ${avgRecovery != null ? Math.round(avgRecovery) + '%' : 'N/D'} | HRV ${avgHrv != null ? Math.round(avgHrv) + 'ms' : 'N/D'} | Sonno ${avgSleepMin != null ? round(avgSleepMin / 60, 1) + 'h' : 'N/D'} | Strain ${avgStrain != null ? round(avgStrain, 1) : 'N/D'}
Oggi: ${todayWhoop ? `Recovery ${todayWhoop.recovery_score ?? 'N/D'}% | HRV ${todayWhoop.hrv_rmssd_ms ?? 'N/D'}ms | Sonno ${todayWhoop.sleep_duration_min != null ? round(todayWhoop.sleep_duration_min / 60, 1) + 'h' : 'N/D'} | Strain ${todayWhoop.day_strain ?? 'N/D'} | Energia bruciata ${todayWhoop.energy_burnt_kcal ?? 'N/D'} kcal` : 'nessun dato'}
Storico giornaliero:
${whoopLines}

--- FINE CONTESTO ---`

  const systemPrompt = `${SYSTEM_BASE}\n\n${context}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages,
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch {
        controller.enqueue(encoder.encode('\n\n[Errore: impossibile contattare il coach AI]'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' },
  })
}
