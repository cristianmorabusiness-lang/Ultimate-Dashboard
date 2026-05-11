'use client'

import { useEffect, useState } from 'react'

interface WeeklySummary {
  content: string
  summary_date: string
  model_used: string
  created_at: string
}

function getLastMonday(): string {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date())
  const dayMap: Record<string, number> = { Sunday: 6, Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 }
  const daysBack = dayMap[weekday] ?? 0
  const d = new Date(Date.now() - daysBack * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d)
}

export default function WeeklyReportPage() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const lastMonday = getLastMonday()
  const weekLabel = new Date(lastMonday).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    fetch(`/api/ai/weekly-report?date=${lastMonday}`)
      .then((r) => r.json())
      .then((data) => { if (data.summary) setSummary(data.summary); setLoading(false) })
      .catch(() => { setError('Errore di caricamento'); setLoading(false) })
  }, [lastMonday])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: lastMonday }),
      })
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
      else setError(data.error ?? 'Generazione fallita')
    } catch { setError('Errore di rete') }
    finally { setGenerating(false) }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>
            Report Settimanale
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Settimana del {weekLabel}</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Generazione...' : summary ? 'Rigenera' : 'Genera Report'}
        </button>
      </div>

      {loading && (
        <div className="card p-14 text-center">
          <p className="text-sm" style={{ color: '#8b7faa' }}>Caricamento...</p>
        </div>
      )}

      {!loading && !summary && !generating && (
        <div className="card p-14 text-center space-y-3">
          <p className="text-base" style={{ color: '#b8add2' }}>Nessun report per questa settimana.</p>
          <p className="text-sm" style={{ color: '#8b7faa' }}>
            Clicca &ldquo;Genera Report&rdquo; per un&apos;analisi approfondita con Claude Opus.
          </p>
        </div>
      )}

      {generating && (
        <div className="card p-14 text-center space-y-2">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: '#8b5cf6', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-sm" style={{ color: '#b8add2' }}>
            Generazione analisi settimanale con Claude Opus...
          </p>
          <p className="text-xs" style={{ color: '#8b7faa' }}>Potrebbe richiedere 15–30 secondi</p>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

      {summary && !generating && (
        <div className="card p-6">
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: '#b8add2' }}>
            {summary.content}
          </pre>
          <div className="mt-6 pt-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
            <span className="font-mono text-xs" style={{ color: '#5e5479' }}>{summary.model_used}</span>
            <span className="text-xs" style={{ color: '#5e5479' }}>
              {new Date(summary.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
