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
  encouraging: { color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-border)', label: 'Ottimo' },
  neutral:     { color: 'var(--accent)',  bg: 'var(--accent-bg)',  border: 'var(--accent-border)',  label: 'Neutro' },
  cautionary:  { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-border)', label: 'Attenzione' },
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
          <span className="pill" style={{ background: tone.bg, color: tone.color, borderColor: tone.border }}>
            {tone.label}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2.5 flex-1">
          {[75, 55, 85, 65, 40].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full animate-pulse"
              style={{ width: `${w}%`, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm flex-1" style={{ color: 'var(--text-muted)' }}>{error}</p>
      )}

      {summary && !loading && (
        <div className="flex-1 rounded-lg p-4 space-y-3"
          style={{ background: tone.bg, borderLeft: `2px solid ${tone.color}` }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{summary.phase_note}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{summary.recovery_insight}</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{summary.nutrition_feedback}</p>
          <div className="pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="section-label mb-1">Priorità oggi</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{summary.priority_action}</p>
          </div>
        </div>
      )}
    </div>
  )
}
