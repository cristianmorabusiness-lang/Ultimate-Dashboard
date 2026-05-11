import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Workout, WorkoutSet } from '@/lib/database.types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `You are a strength training coach. Given an athlete's recent history for one exercise, give a specific recommendation for today's session.

Reply ONLY with valid JSON (no markdown):
{
  "suggested_weight": <number or null>,
  "suggested_reps": "<string, e.g. '4x8' or '3x5'>",
  "rationale": "<1-2 sentences referencing actual numbers>",
  "progression_note": "<1 sentence on trend>"
}

Rules: if athlete hit all reps in last 2 sessions → increase 2.5–5kg. If struggled (RPE>9 or missed reps) → hold or deload 5%. Less than 3 sessions → suggest moderate starting point.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exercise } = await request.json()
  if (!exercise) return NextResponse.json({ error: 'exercise required' }, { status: 400 })

  const { data: wRaw } = await supabase
    .from('workouts').select('id, logged_date').eq('user_id', user.id)
    .order('logged_date', { ascending: false }).limit(90)
  const workouts = (wRaw ?? []) as Pick<Workout, 'id' | 'logged_date'>[]
  if (!workouts.length) return NextResponse.json({ coach: null })

  const { data: sRaw } = await supabase
    .from('workout_sets').select('*')
    .in('workout_id', workouts.map((w) => w.id))
    .ilike('exercise_name', `%${exercise}%`)
    .order('created_at', { ascending: false })
    .limit(60)

  const sets = (sRaw ?? []) as WorkoutSet[]
  if (!sets.length) return NextResponse.json({ coach: null, reason: 'no data' })

  const wMap = new Map(workouts.map((w) => [w.id, w.logged_date]))
  const bySession = new Map<string, { date: string; sets: string[] }>()

  sets.forEach((s) => {
    const date = wMap.get(s.workout_id) ?? ''
    const cur = bySession.get(s.workout_id) ?? { date, sets: [] }
    cur.sets.push(`${s.weight_kg ?? '?'}kg×${s.reps ?? '?'}${s.rpe ? ` @RPE${s.rpe}` : ''}`)
    bySession.set(s.workout_id, cur)
  })

  const sessions = Array.from(bySession.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6)

  const context = `Exercise: ${exercise}\n\nSessions (oldest→newest):\n${sessions.map((s) => `${s.date}: ${s.sets.join(', ')}`).join('\n')}\n\nProvide today's recommendation.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: context }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    try { return NextResponse.json({ coach: JSON.parse(text) }) }
    catch { return NextResponse.json({ coach: null }) }
  } catch {
    return NextResponse.json({ coach: null }, { status: 503 })
  }
}
