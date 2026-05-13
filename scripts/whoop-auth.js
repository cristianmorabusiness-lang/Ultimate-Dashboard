'use strict'

/**
 * One-time WHOOP OAuth2 authorization helper.
 * Run this to get a fresh refresh_token when the existing one expires.
 *
 * Prerequisites:
 *   WHOOP Developer Portal → your app must have this redirect URI registered:
 *   https://www.ultimatedashboards.com/auth/whoop/callback
 *
 * Usage (Windows PowerShell):
 *   $env:WHOOP_CLIENT_ID="xxx"; $env:WHOOP_CLIENT_SECRET="yyy"; node whoop-auth.js
 */

const readline = require('readline')
const { exec } = require('child_process')

const CLIENT_ID     = process.env.WHOOP_CLIENT_ID
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET env vars before running.')
  process.exit(1)
}

const REDIRECT_URI = 'https://www.ultimatedashboards.com/auth/whoop/callback'
const SCOPE        = 'offline read:recovery read:sleep read:workout read:cycles read:body_measurement'
const AUTH_URL     = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const TOKEN_URL    = 'https://api.prod.whoop.com/oauth/oauth2/token'

const authUrl = new URL(AUTH_URL)
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', SCOPE)

console.log('\n=== WHOOP Auth Helper ===\n')
console.log('1. Opening browser — log in and authorize the app.')
console.log('2. After authorizing, the browser will redirect to ultimatedashboards.com')
console.log('   (the page may show a 404 — that is fine).')
console.log('3. Copy the FULL URL from the browser address bar and paste it here.\n')
console.log('Auth URL (open manually if browser does not open):')
console.log(authUrl.toString())
console.log()

const openCmd = process.platform === 'win32'
  ? `start "" "${authUrl.toString()}"`
  : process.platform === 'darwin'
    ? `open "${authUrl.toString()}"`
    : `xdg-open "${authUrl.toString()}"`
exec(openCmd)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Paste the full redirect URL here: ', async (input) => {
  rl.close()

  let code
  try {
    const redirected = new URL(input.trim())
    code = redirected.searchParams.get('code')
    const error = redirected.searchParams.get('error')
    if (error) throw new Error(`WHOOP returned error: ${error}`)
    if (!code) throw new Error('No "code" parameter found in the URL')
  } catch (err) {
    console.error('\nERROR parsing URL:', err.message)
    process.exit(1)
  }

  console.log('\nExchanging code for tokens...')

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      throw new Error(`Token exchange failed: ${tokenRes.status} — ${body}`)
    }

    const tokens = await tokenRes.json()

    console.log('\n✓ Authorization successful!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('REFRESH TOKEN (copy this → update GitHub secret WHOOP_REFRESH_TOKEN):')
    console.log()
    console.log(tokens.refresh_token)
    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\nNext steps:')
    console.log('  1. GitHub repo → Settings → Secrets → Actions')
    console.log('  2. Update WHOOP_REFRESH_TOKEN with the token above')
    console.log('  3. Add/update WHOOP_REDIRECT_URI =', REDIRECT_URI)
    console.log('  4. Trigger the sync: Actions → WHOOP Daily Sync → Run workflow')
    console.log()

  } catch (err) {
    console.error('\nERROR:', err.message)
    process.exit(1)
  }
})
