'use client'

import { useEffect, useState, useCallback } from 'react'

interface WeeklySummary {
  content: string
  summary_date: string
  model_used: string
  created_at: string
}

const TZ = 'Europe/Rome'

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

function getMondayOfThisWeek(): string {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date())
  const dayMap: Record<string, number> = { Sunday: 6, Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 }
  const daysBack = dayMap[weekday] ?? 0
  return fmtDate(new Date(Date.now() - daysBack * 86400000))
}

function shiftWeek(mondayStr: string, weeks: number): string {
  const d = new Date(mondayStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return fmtDate(d)
}

function weekLabel(mondayStr: string): string {
  const start = new Date(mondayStr + 'T12:00:00Z')
  const end = new Date(start.getTime() + 6 * 86400000)
  const startFmt = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startFmt} – ${endFmt}`
}

export default function WeeklyReportPage() {
  const [currentMonday, setCurrentMonday] = useState<string>(getMondayOfThisWeek())
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const thisWeekMonday = getMondayOfThisWeek()
  const isCurrentWeek = currentMonday === thisWeekMonday
  const isFutureWeek = currentMonday > thisWeekMonday

  const loadSummary = useCallback(async (monday: string) => {
    setLoading(true)
    setError('')
    setSummary(null)
    try {
      const res = await fetch(`/api/ai/weekly-report?date=${monday}`)
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
    } catch {
      setError('Errore di caricamento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary(currentMonday)
  }, [currentMonday, loadSummary])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: currentMonday }),
      })
      const data = await res.json()
      if (data.summary) setSummary(data.summary)
      else setError(data.error ?? 'Generazione fallita')
    } catch {
      setError('Errore di rete')
    } finally {
      setGenerating(false)
    }
  }

  function goPrev() {
    setCurrentMonday((m) => shiftWeek(m, -1))
  }

  function goNext() {
    if (isCurrentWeek) return
    setCurrentMonday((m) => shiftWeek(m, 1))
  }

  function goToday() {
    setCurrentMonday(thisWeekMonday)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Report Settimanale
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isCurrentWeek ? 'Settimana corrente' : 'Settimana passata'}
          </p>
        </div>
        <button onClick={generate} disabled={generating || isFutureWeek} className="btn-primary">
          {generating ? 'Generazione...' : summary ? 'Rigenera' : 'Genera Report'}
        </button>
      </div>

      {/* Week navigation */}
      <div className="card p-3 flex items-center justify-between gap-2">
        <button
          onClick={goPrev}
          className="btn-ghost px-3 py-1.5 text-sm"
          aria-label="Settimana precedente"
        >
          ← Precedente
        </button>
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {weekLabel(currentMonday)}
          </p>
          {!isCurrentWeek && (
            <button
              onClick={goToday}
              className="text-[10px] mt-0.5 underline-offset-2 hover:underline transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              Vai a questa settimana
            </button>
          )}
        </div>
        <button
          onClick={goNext}
          disabled={isCurrentWeek}
          className="btn-ghost px-3 py-1.5 text-sm"
          style={isCurrentWeek ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          aria-label="Settimana successiva"
        >
          Successiva →
        </button>
      </div>

      {loading && (
        <div className="card p-14 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
        </div>
      )}

      {!loading && !summary && !generating && (
        <div className="card p-14 text-center space-y-3">
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Nessun report per questa settimana.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {isFutureWeek
              ? 'Settimana futura — non disponibile.'
              : 'Clicca "Genera Report" per un’analisi approfondita con Claude Opus.'}
          </p>
        </div>
      )}

      {generating && (
        <div className="card p-14 text-center space-y-2">
          <div className="flex justify-center gap-1.5 mb-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Generazione analisi settimanale con Claude Opus...
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Potrebbe richiedere 15–30 secondi</p>
        </div>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      {summary && !generating && (
        <div className="card p-6 animate-fade-in">
          <pre
            className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
            style={{ color: 'var(--text-secondary)' }}
          >
            {summary.content}
          </pre>
          <div
            className="mt-6 pt-4 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
              {summary.model_used}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {new Date(summary.created_at).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
