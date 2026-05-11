'use client'

import { useEffect, useState } from 'react'

interface DailySummary {
  phase_note: string
  recovery_insight: string
  nutrition_feedback: string
  priority_action: string
  tone: 'encouraging' | 'neutral' | 'cautionary'
}

interface Props {
  userId: string
  today: string
}

const TONE_COLOR = {
  encouraging: 'border-l-emerald-500',
  neutral: 'border-l-neutral-500',
  cautionary: 'border-l-amber-500',
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
      .catch(() => {
        setError('Could not load AI summary')
        setLoading(false)
      })
  }, [userId, today])

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <h2 className="text-sm font-medium text-neutral-400 mb-4">AI Mentor</h2>

      {loading && (
        <div className="space-y-2">
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className={`h-3 bg-neutral-800 rounded animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-neutral-500 text-sm">{error}</p>
      )}

      {summary && !loading && (
        <div className={`border-l-2 pl-4 space-y-3 ${TONE_COLOR[summary.tone]}`}>
          <p className="text-sm text-neutral-200">{summary.phase_note}</p>
          <p className="text-sm text-neutral-300">{summary.recovery_insight}</p>
          <p className="text-sm text-neutral-300">{summary.nutrition_feedback}</p>
          <div className="pt-1">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Priority</p>
            <p className="text-sm font-medium text-white">{summary.priority_action}</p>
          </div>
        </div>
      )}
    </div>
  )
}
