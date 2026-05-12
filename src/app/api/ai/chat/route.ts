import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PHASE_LABELS } from '@/lib/phase-detection'
import type { Phase, PhaseHistory, UserProfile, WeightLog, Workout } from '@/lib/database.types'
import { daysAgo, localDate } from '@/lib/date'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_BASE = `Sei un coach di natural bodybuilding e nutrizione sportiva altamente qualificato. Hai accesso completo alla storia di allenamento, peso, nutrizione e recupero dell'utente.

Caratteristiche del tuo approccio:
- Rispondi in italiano, in modo diretto e concreto
- Citi numeri specifici dalla storia dell'utente quando pertinenti
- Dai consigli pratici e applicabili immediatamente
- Non ripeti informazioni ovvie o generiche
- Mantieni le risposte concise (max 200 parole) a meno che non sia necessario più dettaglio
- Sei proattivo: se noti qualcosa di rilevante nei dati, lo segnali spontaneamente`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  }
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const ago14 = daysAgo(14)
  const today = localDate()

  const [phaseRes, profileRes, weightRes, workoutRes] = await Promise.all([
    supabase.from('phase_history').select('phase, confidence, caloric_delta, weight_trend, detected_at')
      .eq('user_id', user.id).order('detected_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_profile').select('tdee_kcal, protein_g, carbs_g, fat_g, goal_phase')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('weight_log').select('logged_date, weight_kg')
      .eq('user_id', user.id).gte('logged_date', ago14).order('logged_date', { ascending: false }),
    supabase.from('workouts').select('logged_date, title, workout_type')
      .eq('user_id', user.id).gte('logged_date', ago14).order('logged_date', { ascending: false }),
  ])

  const phase = phaseRes.data as Pick<PhaseHistory, 'phase' | 'confidence' | 'caloric_delta' | 'weight_trend' | 'detected_at'> | null
  const profile = profileRes.data as Pick<UserProfile, 'tdee_kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'goal_phase'> | null
  const weights = (weightRes.data ?? []) as Pick<WeightLog, 'logged_date' | 'weight_kg'>[]
  const workouts = (workoutRes.data ?? []) as Pick<Workout, 'logged_date' | 'title' | 'workout_type'>[]

  const latestWeight = weights[0]?.weight_kg
  const oldestWeight = weights[weights.length - 1]?.weight_kg
  const weightDelta = latestWeight && oldestWeight ? Math.round((latestWeight - oldestWeight) * 100) / 100 : null

  // Count sessions by type in last 14 days
  const sessionCounts = workouts.reduce<Record<string, number>>((acc, w) => {
    const key = w.title ?? w.workout_type
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const context = `--- CONTESTO UTENTE (aggiornato al ${today}) ---
Fase attuale: ${phase ? PHASE_LABELS[phase.phase as Phase] : 'non rilevata'} (confidenza: ${phase ? Math.round((phase.confidence ?? 0) * 100) : 0}%)
Delta calorico stimato: ${phase?.caloric_delta != null ? `${phase.caloric_delta > 0 ? '+' : ''}${phase.caloric_delta} kcal/giorno vs TDEE` : 'N/D'}
Trend peso: ${phase?.weight_trend != null ? `${phase.weight_trend > 0 ? '+' : ''}${phase.weight_trend} kg/settimana` : 'N/D'}

Target profilo:
- TDEE: ${profile?.tdee_kcal ?? 'non impostato'} kcal
- Proteina target: ${profile?.protein_g ?? 'non impostato'}g
- Fase obiettivo: ${profile?.goal_phase ?? 'non impostata'}

Peso ultimi 14 giorni:
- Attuale: ${latestWeight ?? 'N/D'} kg
- 14 gg fa: ${oldestWeight ?? 'N/D'} kg
- Variazione: ${weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : 'N/D'}

Sessioni ultimi 14 giorni (${workouts.length} totali):
${Object.entries(sessionCounts).map(([k, v]) => `- ${k}: ${v}x`).join('\n') || '- Nessuna sessione loggata'}
--- FINE CONTESTO ---`

  const systemPrompt = `${SYSTEM_BASE}\n\n${context}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 800,
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
