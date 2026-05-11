'use client'

import { useEffect, useState } from 'react'

interface DailySummary {
  phase_note: string
  recovery_insight: string
  nutrition_feedback: string
  priority_action: string
  tone: 'encouraging' | 'neutral' | 'cautionary'
}

interface Props { userId: string; today: string }

const TONE = {
  encouraging: { border: '#a78bfa', bg: 'rgba(167,139,250,0.06)', label: 'Ottimo', labelColor: '#c4b5fd' },
  neutral:     { border: '#a78bfa', bg: 'rgba(167,139,250,0.06)', label: 'Neutro', labelColor: '#a78bfa' },
  cautionary:  { border: '#fbbf24', bg: 'rgba(251,191,36,0.06)',  label: 'Attenzione', labelColor: '#fbbf24' },
}

export function AISummaryCard({ userId, today }: Props) {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/ai/daily-summary')
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) setSummary(data.summary)
        if (data.error) setError(data.error)
        setLoading(false)
      })
      .catch(() => { setError('Errore di rete'); setLoading(false) })
  }, [userId, today])

  const tone = summary ? TONE[summary.tone] : TONE.neutral

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">AI Mentor</p>
        {summary && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${tone.border}18`, color: tone.labelColor, border: `1px solid ${tone.border}30` }}>
            {tone.label}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2.5 flex-1">
          {[75, 55, 85, 65, 40].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full animate-pulse"
              style={{ width: `${w}%`, background: 'rgba(139,92,246,0.12)' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm flex-1" style={{ color: '#8b7faa' }}>{error}</p>
      )}

      {summary && !loading && (
        <div className="flex-1 rounded-xl p-4 space-y-3"
          style={{ background: tone.bg, borderLeft: `3px solid ${tone.border}` }}>
          <p className="text-sm leading-relaxed" style={{ color: '#ede9fe' }}>{summary.phase_note}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#b8add2' }}>{summary.recovery_insight}</p>
          <p className="text-sm leading-relaxed" style={{ color: '#b8add2' }}>{summary.nutrition_feedback}</p>
          <div className="pt-1 border-t" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
            <p className="section-label mb-1">Priorità oggi</p>
            <p className="text-sm font-semibold" style={{ color: '#ede9fe' }}>{summary.priority_action}</p>
          </div>
        </div>
      )}
    </div>
  )
}
