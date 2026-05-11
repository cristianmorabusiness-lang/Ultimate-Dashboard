import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PHASE_LABELS } from '@/lib/phase-detection'
import type { Phase, WhoopDaily, WeightLog, UserProfile, PhaseHistory, Meal, Workout } from '@/lib/database.types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const WEEKLY_SYSTEM = `You are a performance analyst and health coach. You receive one week of biometric, training, and nutrition data and produce a structured weekly synthesis. Be analytical, reference specific numbers, and keep each section concise but insightful. Avoid filler phrases.

Format your response as plain text with these section headers (use ## prefix):

## Recovery & HRV Analysis
## Nutrition Adherence
## Training Load
## Phase Alignment
## Priorities for Next Week

Each section: 3-5 sentences. Total response: under 600 words.`

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
  const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().split('T')[0]

  const whoopRes = await supabase.from('whoop_daily').select('*').eq('user_id', user.id).gte('cycle_date', weekStart).lte('cycle_date', weekEnd).order('cycle_date')
  const weightRes = await supabase.from('weight_log').select('logged_date, weight_kg').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd).order('logged_date')
  const profileRes = await supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle()
  const phaseRes = await supabase.from('phase_history').select('*').eq('user_id', user.id).order('detected_at', { ascending: false }).limit(1).maybeSingle()
  const mealsRes = await supabase.from('meals').select('id, logged_date').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd)
  const workoutRes = await supabase.from('workouts').select('*').eq('user_id', user.id).gte('logged_date', weekStart).lte('logged_date', weekEnd)

  const whoop = (whoopRes.data ?? []) as WhoopDaily[]
  const weights = (weightRes.data ?? []) as Pick<WeightLog, 'logged_date' | 'weight_kg'>[]
  const profile = profileRes.data as UserProfile | null
  const phase = phaseRes.data as PhaseHistory | null
  const mealsData = (mealsRes.data ?? []) as Pick<Meal, 'id' | 'logged_date'>[]
  const workouts = (workoutRes.data ?? []) as Workout[]

  // Aggregate daily kcal
  let dailyKcal = 0
  if (mealsData.length > 0) {
    const { data: itemsRaw } = await supabase.from('meal_items').select('kcal').in('meal_id', mealsData.map((m) => m.id))
    const items = (itemsRaw ?? []) as { kcal: number }[]
    dailyKcal = Math.round(items.reduce((a, b) => a + b.kcal, 0) / Math.max(mealsData.length / 3, 1))
  }

  const avgRecovery = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.recovery_score ?? 0), 0) / whoop.length) : null
  const avgHRV = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.hrv_rmssd_ms ?? 0), 0) / whoop.length * 10) / 10 : null
  const avgSleep = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.sleep_duration_min ?? 0), 0) / whoop.length / 60 * 10) / 10 : null
  const avgStrain = whoop.length ? Math.round(whoop.reduce((a, b) => a + (b.day_strain ?? 0), 0) / whoop.length * 10) / 10 : null

  const weightStart = weights[0]?.weight_kg
  const weightEnd = weights[weights.length - 1]?.weight_kg
  const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 100) / 100 : null

  const context = `Week: ${weekStart} to ${weekEnd}
Current phase: ${phase ? PHASE_LABELS[phase.phase as Phase] : 'Unknown'}
Profile targets: TDEE ${profile?.tdee_kcal ?? 'not set'} kcal, Protein ${profile?.protein_g ?? 'not set'}g

WHOOP (${whoop.length} days of data):
- Average recovery: ${avgRecovery ?? 'no data'}/100
- Average HRV: ${avgHRV ?? 'no data'} ms
- Average sleep: ${avgSleep ?? 'no data'} hours
- Average strain: ${avgStrain ?? 'no data'}/21

Weight:
- Start of week: ${weightStart ?? 'no data'} kg
- End of week: ${weightEnd ?? 'no data'} kg
- Change: ${weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : 'no data'}

Nutrition:
- Days with meals logged: ${new Set(mealsData.map((m) => m.logged_date)).size}/7
- Estimated average daily calories: ${dailyKcal > 0 ? `${dailyKcal} kcal` : 'insufficient data'}

Training:
- Workouts completed: ${workouts.length}
- Types: ${workouts.map((w) => w.workout_type).join(', ') || 'none'}`

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
    console.error('AI weekly report error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}

function getLastMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
