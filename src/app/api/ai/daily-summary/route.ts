import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { PHASE_LABELS } from '@/lib/phase-detection'
import type { Phase, WhoopDaily, UserProfile, PhaseHistory, MealItem } from '@/lib/database.types'
import { localDate } from '@/lib/date'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a personal health mentor with access to a user's daily biometric, nutrition, and lifestyle data. Your role is to give concise, actionable daily coaching based on their current training phase, today's metrics, and their daily routine.

Use the user's routine (wake time, workout window) to make advice time-specific: e.g. pre-workout nutrition timing, whether to train today given recovery, optimal sleep target to hit their wake time.

Respond ONLY with a valid JSON object in this exact structure — no markdown, no preamble:
{
  "phase_note": "one sentence about how today's data aligns with their current training phase",
  "recovery_insight": "one sentence based on their HRV and sleep data — be specific to the numbers",
  "nutrition_feedback": "one sentence on macro adherence — mention specific numbers",
  "priority_action": "the single most important action for today, concrete and time-specific if possible",
  "tone": "encouraging"
}

tone must be exactly one of: encouraging, neutral, cautionary.
Each field must be under 40 words. Reference actual numbers. Never give generic advice.`

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = localDate()

  // Return cached summary if it exists for today
  const { data: cached } = await supabase
    .from('ai_summaries')
    .select('content')
    .eq('user_id', user.id)
    .eq('summary_date', today)
    .eq('summary_type', 'daily')
    .maybeSingle()

  if (cached) {
    const cachedData = cached as { content: string }
    try {
      return NextResponse.json({ summary: JSON.parse(cachedData.content) })
    } catch {
      return NextResponse.json({ summary: cachedData.content })
    }
  }

  // Build context from today's data
  const whoopRes = await supabase.from('whoop_daily').select('*').eq('user_id', user.id).eq('cycle_date', today).maybeSingle()
  const profileRes = await supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle()
  const phaseRes = await supabase.from('phase_history').select('*').eq('user_id', user.id).order('detected_at', { ascending: false }).limit(1).maybeSingle()
  const mealsRes = await supabase.from('meals').select('id').eq('user_id', user.id).eq('logged_date', today)

  const whoop = whoopRes.data as WhoopDaily | null
  const profile = profileRes.data as UserProfile | null
  const phase = phaseRes.data as PhaseHistory | null
  const mealsData = (mealsRes.data ?? []) as { id: string }[]

  let macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  if (mealsData.length > 0) {
    const { data: itemsRaw } = await supabase.from('meal_items').select('kcal, protein_g, carbs_g, fat_g').in('meal_id', mealsData.map((m) => m.id))
    const items = (itemsRaw ?? []) as Pick<MealItem, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]
    macros = items.reduce((acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }), macros)
  }

  const phaseLabel = phase ? PHASE_LABELS[phase.phase as Phase] : 'Unknown'

  // Extract actual wake time from WHOOP cycle end (Italy timezone)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = whoop?.raw_json as Record<string, any> | null
  const cycleEnd = raw?.cycle?.end as string | undefined
  const actualWakeTime = cycleEnd
    ? new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(new Date(cycleEnd))
    : null

  const routineLines = [
    profile?.wake_time ? `- Typical wake time: ${profile.wake_time}` : null,
    actualWakeTime ? `- Today's actual wake time (from WHOOP): ${actualWakeTime}` : null,
    (profile?.workout_start && profile?.workout_end)
      ? `- Training window: ${profile.workout_start}–${profile.workout_end}`
      : profile?.workout_start
        ? `- Usual training time: ${profile.workout_start}`
        : null,
  ].filter(Boolean).join('\n')

  const userContext = `Date: ${today}
Phase: ${phaseLabel}${phase ? ` (confidence: ${Math.round((phase.confidence ?? 0) * 100)}%)` : ''}

${routineLines ? `Daily routine:\n${routineLines}\n\n` : ''}WHOOP data:
- Recovery score: ${whoop?.recovery_score ?? 'no data'}/100
- HRV: ${whoop?.hrv_rmssd_ms != null ? `${whoop.hrv_rmssd_ms.toFixed(1)}ms` : 'no data'}
- Resting HR: ${whoop?.resting_hr_bpm ?? 'no data'} bpm
- Sleep performance: ${whoop?.sleep_performance ?? 'no data'}/100
- Sleep duration: ${whoop?.sleep_duration_min != null ? `${(whoop.sleep_duration_min / 60).toFixed(1)}h` : 'no data'}
- Day strain: ${whoop?.day_strain ?? 'no data'}/21

Nutrition logged today:
- Calories: ${Math.round(macros.kcal)} kcal (target: ${profile?.tdee_kcal ?? 'not set'})
- Protein: ${Math.round(macros.protein_g)}g (target: ${profile?.protein_g ?? 'not set'}g)
- Carbs: ${Math.round(macros.carbs_g)}g (target: ${profile?.carbs_g ?? 'not set'}g)
- Fat: ${Math.round(macros.fat_g)}g (target: ${profile?.fat_g ?? 'not set'}g)

Generate the coaching summary JSON now.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContext }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    // Store in ai_summaries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('ai_summaries').upsert(
      {
        user_id: user.id,
        summary_date: today,
        summary_type: 'daily',
        model_used: 'claude-sonnet-4-6',
        prompt_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        content,
      } as any,
      { onConflict: 'user_id,summary_date,summary_type' }
    )

    try {
      return NextResponse.json({ summary: JSON.parse(content) })
    } catch {
      return NextResponse.json({ summary: content })
    }
  } catch (err: unknown) {
    console.error('AI daily summary error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'AI unavailable', summary: null }, { status: 503 })
  }
}
