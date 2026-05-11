'use client'

import { useEffect, useState } from 'react'

interface WeeklySummary {
  content: string
  summary_date: string
  model_used: string
  created_at: string
}

export default function WeeklyReportPage() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const lastMonday = getLastMonday()

  useEffect(() => {
    fetch(`/api/ai/weekly-report?date=${lastMonday}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) setSummary(data.summary)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load report')
        setLoading(false)
      })
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
      else setError(data.error ?? 'Failed to generate')
    } catch {
      setError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Weekly Report</h1>
          <p className="text-neutral-400 text-sm">
            Week of {new Date(lastMonday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="px-3 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg transition-colors"
        >
          {generating ? 'Generating...' : summary ? 'Regenerate' : 'Generate Report'}
        </button>
      </div>

      {loading && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      )}

      {!loading && !summary && !generating && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-neutral-400">No weekly report yet for this week.</p>
          <p className="text-neutral-500 text-sm">Click &ldquo;Generate Report&rdquo; to create a deep-dive analysis using Claude Opus.</p>
        </div>
      )}

      {generating && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <p className="text-neutral-400 text-sm">Generating your weekly analysis with Claude Opus...</p>
          <p className="text-neutral-500 text-xs mt-1">This may take 15–30 seconds</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {summary && !generating && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <pre className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {summary.content}
          </pre>
          <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-600">
            <span>{summary.model_used}</span>
            <span>
              Generated {new Date(summary.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function getLastMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
