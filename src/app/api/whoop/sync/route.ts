import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const maxDuration = 30

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API = 'https://api.prod.whoop.com/developer/v2'
const TZ = 'Europe/Rome'

function toItalyDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
}

async function whoopGet(accessToken: string, path: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${WHOOP_API}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`WHOOP ${path} failed: ${res.status}`)
  return res.json()
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.WHOOP_CLIENT_ID
  const clientSecret = process.env.WHOOP_CLIENT_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'WHOOP credentials not configured on server' }, { status: 500 })
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service key not configured' }, { status: 500 })
  }

  const admin = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Get refresh token from Supabase, fall back to env var
  const { data: configRow } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'whoop_refresh_token')
    .single()

  const currentRefreshToken = configRow?.value ?? process.env.WHOOP_REFRESH_TOKEN
  if (!currentRefreshToken) {
    return NextResponse.json({ error: 'No WHOOP refresh token found. Re-authorize via /auth/whoop.' }, { status: 400 })
  }

  // Refresh access token
  const tokenRes = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: currentRefreshToken,
      redirect_uri: process.env.WHOOP_REDIRECT_URI ?? 'https://www.ultimatedashboards.com/auth/whoop/callback',
      scope: 'offline read:recovery read:sleep read:workout read:cycles read:body_measurement',
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    return NextResponse.json({ error: `Token refresh failed: ${body}` }, { status: 502 })
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token: newRefresh } = tokens

  // Persist rotated refresh token
  if (newRefresh) {
    await admin.from('app_config').upsert({
      key: 'whoop_refresh_token',
      value: newRefresh,
      updated_at: new Date().toISOString(),
    })
  }

  // Fetch last 2 days of data
  const start = new Date(Date.now() - 2 * 86400000).toISOString()
  const [cycleData, sleepData, recoveryData, workoutData] = await Promise.all([
    whoopGet(access_token, '/cycle', { start, limit: 10 }),
    whoopGet(access_token, '/activity/sleep', { start, limit: 10 }),
    whoopGet(access_token, '/recovery', { start, limit: 10 }),
    whoopGet(access_token, '/activity/workout', { start, limit: 25 }),
  ])

  const cycles: Record<string, unknown>[] = cycleData.records ?? []
  if (cycles.length === 0) {
    return NextResponse.json({ ok: true, records: 0, message: 'No cycles found' })
  }

  const records = cycles.map((cycle: Record<string, unknown>) => {
    const c = cycle as Record<string, unknown>
    const sleep = (sleepData.records ?? []).find((s: Record<string, unknown>) => s.cycle_id === c.id) ?? null
    const recovery = (recoveryData.records ?? []).find((r: Record<string, unknown>) => r.cycle_id === c.id) ?? null
    const cycleDate = toItalyDate((c.end ?? c.start) as string)
    const workouts = (workoutData.records ?? []).filter(
      (w: Record<string, unknown>) => toItalyDate(w.start as string) === cycleDate
    )

    const sleepScore = (sleep as Record<string, unknown> | null)?.score as Record<string, unknown> | undefined
    const recoveryScore = (recovery as Record<string, unknown> | null)?.score as Record<string, unknown> | undefined
    const cycleScore = (c.score as Record<string, unknown> | undefined)

    return {
      user_id: user.id,
      cycle_date: cycleDate,
      cycle_id: c.id as number,
      recovery_score: (recoveryScore?.recovery_score as number) ?? null,
      hrv_rmssd_ms: (recoveryScore?.hrv_rmssd_milli as number) ?? null,
      resting_hr_bpm: (recoveryScore?.resting_heart_rate as number) ?? null,
      sleep_performance: (sleepScore?.sleep_performance_percentage as number) ?? null,
      sleep_duration_min: sleepScore?.total_in_bed_time_milli != null
        ? Math.round((sleepScore.total_in_bed_time_milli as number) / 60000)
        : null,
      sleep_disturbances: (sleepScore?.disturbances as number) ?? null,
      day_strain: (cycleScore?.strain as number) ?? null,
      energy_burnt_kcal: cycleScore?.kilojoule != null
        ? Math.round((cycleScore.kilojoule as number) / 4.184)
        : null,
      raw_json: { cycle, sleep, recovery, workouts },
      synced_at: new Date().toISOString(),
    }
  })

  const { error } = await admin
    .from('whoop_daily')
    .upsert(records, { onConflict: 'user_id,cycle_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, records: records.length, synced_at: new Date().toISOString() })
}
