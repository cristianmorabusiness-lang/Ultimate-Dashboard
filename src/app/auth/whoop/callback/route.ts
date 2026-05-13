import { NextResponse } from 'next/server'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return htmlResponse(errorPage(error))
  }

  if (!code) {
    return htmlResponse(errorPage('Nessun codice di autorizzazione ricevuto da WHOOP.'))
  }

  const clientId = process.env.WHOOP_CLIENT_ID
  const clientSecret = process.env.WHOOP_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return htmlResponse(errorPage('WHOOP_CLIENT_ID o WHOOP_CLIENT_SECRET non configurati nel server.'))
  }

  const redirectUri = `${origin}/auth/whoop/callback`

  try {
    const res = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return htmlResponse(errorPage(`Scambio token fallito (${res.status}): ${body}`))
    }

    const tokens = await res.json()
    const refreshToken: string = tokens.refresh_token ?? ''
    const accessToken: string = tokens.access_token ?? ''
    const scope: string = tokens.scope ?? ''

    // Auto-save refresh token to Supabase so the nightly sync picks it up immediately
    let savedToSupabase = false
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey && refreshToken) {
      const admin = createSupabaseServiceClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      })
      const { error: upsertErr } = await admin
        .from('app_config')
        .upsert({ key: 'whoop_refresh_token', value: refreshToken, updated_at: new Date().toISOString() })
      savedToSupabase = !upsertErr
    }

    return htmlResponse(successPage(refreshToken, accessToken, scope, savedToSupabase))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return htmlResponse(errorPage(`Errore di rete: ${msg}`))
  }
}

function htmlResponse(body: string) {
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function successPage(refreshToken: string, accessToken: string, scope: string, savedToSupabase: boolean) {
  const savedBanner = savedToSupabase
    ? `<div style="background:#052e16;border:1px solid #166534;border-radius:8px;padding:1rem;margin-bottom:1.5rem;color:#4ade80;font-size:0.9rem;">
        ✓ Refresh token salvato automaticamente su Supabase. Il sync notturno è pronto.
       </div>`
    : `<div class="warning">
        ⚠️ Salvataggio automatico su Supabase non riuscito. Copia il Refresh Token e aggiorna manualmente il secret GitHub <code>WHOOP_REFRESH_TOKEN</code>.
       </div>`

  const nextSteps = savedToSupabase
    ? `<div class="step"><div class="step-num">1</div><p>Vai su GitHub Actions → <strong>WHOOP Daily Sync</strong> → <strong>Run workflow</strong> per testare il primo sync.</p></div>
       <div class="step"><div class="step-num">2</div><p>Controlla la dashboard — i dati WHOOP appariranno dopo il sync.</p></div>`
    : `<div class="step"><div class="step-num">1</div><p>Vai su GitHub → <strong>Settings → Secrets → Actions</strong> → aggiorna <code>WHOOP_REFRESH_TOKEN</code>.</p></div>
       <div class="step"><div class="step-num">2</div><p>Esegui manualmente il workflow <code>whoop-sync.yml</code>.</p></div>`

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WHOOP Connesso</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f0f0f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 2.5rem; max-width: 680px; width: 100%; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #4ade80; }
    .subtitle { color: #888; margin-bottom: 1.5rem; font-size: 0.9rem; }
    h2 { font-size: 1rem; color: #aaa; margin-bottom: 0.5rem; margin-top: 1.5rem; }
    .token-box { background: #0d0d0d; border: 1px solid #333; border-radius: 8px; padding: 1rem; font-family: monospace; font-size: 0.8rem; word-break: break-all; color: #7dd3fc; }
    .copy-btn { background: #1d4ed8; color: white; border: none; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; margin-top: 0.5rem; }
    .copy-btn:hover { background: #2563eb; }
    .steps { margin-top: 2rem; border-top: 1px solid #222; padding-top: 1.5rem; }
    .step { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: flex-start; }
    .step-num { background: #1d4ed8; color: white; border-radius: 50%; width: 1.6rem; height: 1.6rem; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; margin-top: 0.1rem; }
    .step p { font-size: 0.9rem; color: #ccc; line-height: 1.5; }
    code { background: #1a1a1a; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; color: #f0abfc; }
    .warning { background: #1c1000; border: 1px solid #78350f; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: #fbbf24; }
    .dashboard-btn { display:inline-block; margin-top:1.5rem; background:#7c3aed; color:white; padding:0.6rem 1.4rem; border-radius:8px; text-decoration:none; font-size:0.9rem; }
    .dashboard-btn:hover { background:#6d28d9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>✓ WHOOP Connesso con successo!</h1>
    <p class="subtitle">Autorizzazione completata · Scope: ${scope}</p>

    ${savedBanner}

    <h2>Refresh Token (backup)</h2>
    <div class="token-box" id="refresh">${refreshToken}</div>
    <button class="copy-btn" onclick="copy('refresh', this)">Copia</button>

    <div class="steps">
      <h2 style="margin-top:0">Prossimi passi</h2>
      ${nextSteps}
    </div>

    <a class="dashboard-btn" href="/">Vai alla Dashboard</a>
  </div>
  <script>
    function copy(id, btn) {
      navigator.clipboard.writeText(document.getElementById(id).textContent).then(() => {
        btn.textContent = 'Copiato!'
        setTimeout(() => btn.textContent = 'Copia', 2000)
      })
    }
  </script>
</body>
</html>`
}

function errorPage(message: string) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Errore WHOOP</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f0f0f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #111; border: 1px solid #3b0d0d; border-radius: 16px; padding: 2.5rem; max-width: 600px; width: 100%; }
    h1 { color: #f87171; margin-bottom: 1rem; }
    p { color: #aaa; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem; }
    code { background: #1a1a1a; padding: 0.2rem 0.4rem; border-radius: 4px; color: #fbbf24; word-break: break-all; }
    a { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Errore autorizzazione WHOOP</h1>
    <p><code>${message}</code></p>
    <p>Riprova il flusso di autorizzazione dalla tua dashboard oppure <a href="/">torna alla home</a>.</p>
  </div>
</body>
</html>`
}
