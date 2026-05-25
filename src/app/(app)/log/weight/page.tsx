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

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
  const todayLabel = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

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
      setError(data.error ?? 'Errore nel salvataggio')
    }
    setSaving(false)
  }

  const chartData = entries.map((e) => ({ logged_date: e.logged_date, weight_kg: e.weight_kg }))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
          Log Peso
        </h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>{todayLabel}</p>
      </div>

      <div className="card p-5">
        <p className="section-label mb-4">Inserisci misurazione</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="82.5"
                required
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>% Grasso (opzionale)</label>
              <input
                type="number"
                step="0.1"
                min="3"
                max="60"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                placeholder="18.5"
                className="inp"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Nota (opzionale)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="es. mattina a digiuno, post-workout..."
              className="inp"
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          <button type="submit" disabled={saving || !weight} className="btn-primary">
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="card p-5">
          <p className="section-label mb-4">Andamento</p>
          <WeightSparkline data={chartData} />
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="section-label">Storico</p>
          </div>
          <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left px-4 md:px-5 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Data</th>
                <th className="text-right px-4 md:px-5 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Peso</th>
                <th className="text-right px-4 md:px-5 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>% Grasso</th>
                <th className="text-left px-4 md:px-5 py-2.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 14).map((e, idx) => (
                <tr key={e.id}
                  style={{ borderBottom: idx < Math.min(entries.length, 14) - 1 ? '1px solid var(--divider)' : undefined }}>
                  <td className="px-4 md:px-5 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{e.logged_date}</td>
                  <td className="px-4 md:px-5 py-3 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{e.weight_kg} kg</td>
                  <td className="px-4 md:px-5 py-3 text-right font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {e.body_fat_pct != null ? `${e.body_fat_pct}%` : '—'}
                  </td>
                  <td className="px-4 md:px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{e.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="card p-14 text-center">
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>Nessuna misurazione ancora.</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Inserisci il tuo peso ogni mattina per tracciare i progressi.</p>
        </div>
      )}
    </div>
  )
}
