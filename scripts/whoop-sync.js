'use strict'

// WHOOP daily sync — runs via GitHub Actions cron at 02:00 UTC
// Refreshes OAuth token, fetches last 2 days of data, upserts to Supabase
// Doubles as the daily Supabase free-tier keep-alive ping

const { createClient } = require('@supabase/supabase-js')

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_API = 'https://api.prod.whoop.com/developer/v1'

const required = ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REFRESH_TOKEN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`)
})

async function refreshToken() {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      refresh_token: process.env.WHOOP_REFRESH_TOKEN,
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

  // 1. Refresh OAuth token
  const tokens = await refreshToken()
  const { access_token, refresh_token: newRefresh } = tokens
  console.log('[whoop-sync] Token refreshed')

  // Expose new refresh token for the GitHub Actions secret-update step
  if (newRefresh && newRefresh !== process.env.WHOOP_REFRESH_TOKEN) {
    // GitHub Actions env file syntax
    const fs = require('fs')
    const envFile = process.env.GITHUB_ENV
    if (envFile) {
      fs.appendFileSync(envFile, `NEW_REFRESH_TOKEN=${newRefresh}\n`)
      console.log('[whoop-sync] New refresh token exported to GITHUB_ENV')
    }
  }

  // 2. Fetch last 2 days (overlap prevents gaps on API delays)
  const start = new Date(Date.now() - 2 * 86400000).toISOString()
  const [cycleData, sleepData, recoveryData] = await Promise.all([
    whoopGet(access_token, '/cycle', { start, limit: 10 }),
    whoopGet(access_token, '/sleep', { start, limit: 10 }),
    whoopGet(access_token, '/recovery', { start, limit: 10 }),
  ])

  const cycles = cycleData.records ?? []
  console.log(`[whoop-sync] Fetched ${cycles.length} cycle(s)`)
  if (cycles.length === 0) {
    console.log('[whoop-sync] No cycles to sync, done')
    return
  }

  // 3. Connect to Supabase with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

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
