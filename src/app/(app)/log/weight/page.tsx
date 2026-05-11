'use client'

import { useEffect, useState } from 'react'
import { WeightSparkline } from '@/components/dashboard/WeightSparkline'

interface WeightEntry {
  id: string
  logged_date: string
  weight_kg: number
  body_fat_pct: number | null
  note: string | null
}

export default function LogWeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  async function load() {
    const res = await fetch('/api/log/weight')
    const data = await res.json()
    if (data.entries) setEntries(data.entries)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!weight) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/log/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight_kg: parseFloat(weight),
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        note: note || null,
        logged_date: today,
      }),
    })
    if (res.ok) {
      setWeight('')
      setBodyFat('')
      setNote('')
      await load()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Save failed')
    }
    setSaving(false)
  }

  const chartData = entries.map((e) => ({ logged_date: e.logged_date, weight_kg: e.weight_kg }))

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Log Weight</h1>
        <p className="text-neutral-400 text-sm">Daily check-in</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <h2 className="text-sm font-medium text-neutral-300 mb-4">Today — {today}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="82.5"
                required
                className={input}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Body fat % (optional)</label>
              <input
                type="number"
                step="0.1"
                min="3"
                max="60"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="18.5"
                className={input}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. post-workout, morning fasted"
              className={input}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={saving || !weight}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Log weight'}
          </button>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h2 className="text-sm font-medium text-neutral-400 mb-4">Last 14 days</h2>
          <WeightSparkline data={chartData} />
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left p-3 text-xs text-neutral-500 font-medium">Date</th>
                <th className="text-right p-3 text-xs text-neutral-500 font-medium">Weight (kg)</th>
                <th className="text-right p-3 text-xs text-neutral-500 font-medium">Body fat %</th>
                <th className="text-left p-3 text-xs text-neutral-500 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 14).map((e) => (
                <tr key={e.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                  <td className="p-3 text-neutral-300">{e.logged_date}</td>
                  <td className="p-3 text-right text-white font-medium">{e.weight_kg}</td>
                  <td className="p-3 text-right text-neutral-400">{e.body_fat_pct ?? '—'}</td>
                  <td className="p-3 text-neutral-500 text-xs">{e.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const input = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
