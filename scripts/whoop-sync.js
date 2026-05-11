'use strict'

// WHOOP daily sync — runs via GitHub Actions cron at 02:00 UTC
// Refresh token is persisted in Supabase app_config table (key: whoop_refresh_token)
// Falls back to WHOOP_REFRESH_TOKEN env var on first run

const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API = 'https://api.prod.whoop.com/developer/v1'

const required = ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws } }
)

async function getRefreshToken() {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'whoop_refresh_token')
    .single()

  if (!error && data?.value) return data.value

  // First run: fall back to env var
  const envToken = process.env.WHOOP_REFRESH_TOKEN
  if (envToken) return envToken

  throw new Error('No refresh token found in Supabase app_config or WHOOP_REFRESH_TOKEN env var')
}

async function saveRefreshToken(token) {
  const { error } = await supabase
    .from('app_config')
    .upsert({ key: 'whoop_refresh_token', value: token, updated_at: new Date().toISOString() })
  if (error) throw new Error(`Failed to save refresh token: ${JSON.stringify(error)}`)
}

async function refreshToken(currentToken) {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      refresh_token: currentToken,
      scope: 'offline read:recovery read:sleep read:workout read:cycles read:body_measurement',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} — ${await res.text()}`)
  return res.json()
}

async function whoopGet(accessToken, path, params = {}) {
  const url = new URL(`${WHOOP_API}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`WHOOP ${path} failed: ${res.status}`)
  return res.json()
}

async function main() {
  console.log(`[whoop-sync] Starting at ${new Date().toISOString()}`)

  // 1. Get current refresh token and exchange for new tokens
  const currentRefreshToken = await getRefreshToken()
  const tokens = await refreshToken(currentRefreshToken)
  const { access_token, refresh_token: newRefresh } = tokens
  console.log('[whoop-sync] Token refreshed')

  // 2. Persist new refresh token to Supabase immediately
  if (newRefresh) {
    await saveRefreshToken(newRefresh)
    console.log('[whoop-sync] Refresh token saved to Supabase')
  }

  // 3. Fetch last 2 days (overlap prevents gaps on API delays)
  const start = new Date(Date.now() - 2 * 86400000).toISOString()
  const [cycleData, sleepData, recoveryData] = await Promise.all([
    whoopGet(access_token, '/cycle', { start, limit: 10 }),
    whoopGet(access_token, '/activity/sleep', { start, limit: 10 }),
    whoopGet(access_token, '/recovery', { start, limit: 10 }),
  ])

  const cycles = cycleData.records ?? []
  console.log(`[whoop-sync] Fetched ${cycles.length} cycle(s)`)
  if (cycles.length === 0) {
    console.log('[whoop-sync] No cycles to sync, done')
    return
  }

  // 4. Get the single user
  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers()
  if (usersErr || !users?.length) throw new Error(`No users found: ${usersErr?.message}`)
  const userId = users[0].id
  console.log(`[whoop-sync] Syncing for user ${userId}`)

  // 5. Build upsert records
  const records = cycles.map((cycle) => {
    const sleep = sleepData.records?.find((s) => s.cycle_id === cycle.id)
    const recovery = recoveryData.records?.find((r) => r.cycle_id === cycle.id)

    return {
      user_id: userId,
      cycle_date: cycle.start.slice(0, 10),
      cycle_id: cycle.id,
      recovery_score: recovery?.score?.recovery_score ?? null,
      hrv_rmssd_ms: recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr_bpm: recovery?.score?.resting_heart_rate ?? null,
      sleep_performance: sleep?.score?.sleep_performance_percentage ?? null,
      sleep_duration_min: sleep?.score?.total_in_bed_time_milli != null
        ? Math.round(sleep.score.total_in_bed_time_milli / 60000)
        : null,
      sleep_disturbances: sleep?.score?.disturbances ?? null,
      day_strain: cycle.score?.strain ?? null,
      energy_burnt_kcal: cycle.score?.kilojoule != null
        ? Math.round(cycle.score.kilojoule / 4.184)
        : null,
      raw_json: { cycle, sleep: sleep ?? null, recovery: recovery ?? null },
      synced_at: new Date().toISOString(),
    }
  })

  // 6. Upsert — onConflict(user_id, cycle_id) updates existing rows
  const { error } = await supabase
    .from('whoop_daily')
    .upsert(records, { onConflict: 'user_id,cycle_id' })

  if (error) throw new Error(`Supabase upsert failed: ${JSON.stringify(error)}`)

  console.log(`[whoop-sync] Upserted ${records.length} record(s) — done at ${new Date().toISOString()}`)
}

main().catch((err) => {
  console.error('[whoop-sync] FATAL:', err.message)
  process.exit(1)
})
