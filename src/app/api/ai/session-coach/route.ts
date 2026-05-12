import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `Sei un coach di natural bodybuilding esperto in ipertrofia. Ricevi i dati completi delle ultime sessioni di allenamento di un utente e devi analizzare ogni esercizio e fornire raccomandazioni precise per la prossima sessione.

Rispondi SOLO con un JSON valido, senza markdown, in questa struttura esatta:
{
  "session_note": "valutazione generale della sessione in 1-2 frasi",
  "exercises": [
    {
      "exercise": "nome esercizio",
      "last_best": "sintesi ultima sessione (es. 4×10 @ 45kg)",
      "suggested_weight": numero o null,
      "suggested_reps": "range reps (es. 8-10)",
      "adjustment": "descrizione breve del cambiamento (es. +2.5kg, stessa intensità, -1 serie)",
      "note": "motivazione tecnica in max 20 parole"
    }
  ]
}

Principi da applicare:
- Se l'utente ha raggiunto il range alto di reps su tutte le serie → aumenta il carico del 2-5%
- Se ha fatto meno reps del range basso → mantieni o riduci leggermente
- Se le serie sono calate molto (es. 10-10-8-6) → mantieni il carico, migliora la consistenza
- Per esercizi con peso corporeo o assistenza (peso negativo) → suggerisci progressione con meno assistenza
- Rispondi sempre in italiano`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session } = await request.json() as { session: string }
  if (!session) return NextResponse.json({ error: 'session required' }, { status: 400 })

  // Fetch last 3 workouts of this session type
  const { data: workoutsRaw } = await supabase
    .from('workouts')
    .select('id, logged_date, title')
    .eq('user_id', user.id)
    .ilike('title', session)
    .order('logged_date', { ascending: false })
    .limit(3)

  type WorkoutRow = { id: string; logged_date: string; title: string }
  const workouts = (workoutsRaw ?? []) as WorkoutRow[]

  if (workouts.length === 0) {
    return NextResponse.json({ error: 'Nessuna sessione trovata' }, { status: 404 })
  }

  // Fetch sets for all found workouts
  const { data: setsRaw } = await supabase
    .from('workout_sets')
    .select('workout_id, exercise_name, set_number, reps, weight_kg')
    .in('workout_id', workouts.map((w) => w.id))
    .order('set_number', { ascending: true })

  type SetRow = { workout_id: string; exercise_name: string; set_number: number; reps: number; weight_kg: number }
  const sets = (setsRaw ?? []) as SetRow[]

  // Group sets by workout
  const byWorkout = new Map<string, SetRow[]>()
  for (const s of sets) {
    if (!byWorkout.has(s.workout_id)) byWorkout.set(s.workout_id, [])
    byWorkout.get(s.workout_id)!.push(s)
  }

  // Build context string
  const lines: string[] = []
  for (const w of workouts) {
    lines.push(`\n--- Sessione ${w.title} del ${w.logged_date} ---`)
    const wSets = byWorkout.get(w.id) ?? []
    const byEx = new Map<string, SetRow[]>()
    for (const s of wSets) {
      if (!byEx.has(s.exercise_name)) byEx.set(s.exercise_name, [])
      byEx.get(s.exercise_name)!.push(s)
    }
    for (const [ex, exSets] of byEx) {
      const detail = exSets.map((s) => `S${s.set_number}: ${s.reps}rip@${s.weight_kg}kg`).join(', ')
      lines.push(`  ${ex}: ${detail}`)
    }
  }

  const contextText = lines.join('\n')

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Analizza i seguenti dati e fornisci raccomandazioni per la prossima sessione ${session}:\n${contextText}`,
      }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI parse error' }, { status: 500 })

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      session,
      last_date: workouts[0].logged_date,
      coach: result,
    })
  } catch {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
