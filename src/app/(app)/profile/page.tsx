'use client'

import { useEffect, useState } from 'react'

interface Profile {
  height_cm: number
  birth_date: string
  sex: 'male' | 'female' | 'other'
  goal_phase: 'cut' | 'bulk' | 'lean_bulk' | 'maintenance' | null
  tdee_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

const PHASES = [
  { value: 'cut',         label: 'Cut',         desc: 'Deficit calorico — perdita di grasso', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
  { value: 'bulk',        label: 'Bulk',        desc: 'Surplus aggressivo — massa muscolare', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  { value: 'lean_bulk',   label: 'Lean Bulk',   desc: 'Surplus controllato — recomposizione', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  { value: 'maintenance', label: 'Maintenance', desc: 'Equilibrio calorico — mantenimento',   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
]

const SEX_OPTIONS = [
  { value: 'male',   label: 'Maschio' },
  { value: 'female', label: 'Femmina' },
  { value: 'other',  label: 'Altro' },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile)
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'Errore nel salvataggio')
      else setSaved(true)
    } catch {
      setError('Errore di rete')
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48">
        <p className="text-sm" style={{ color: '#8b7faa' }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>Profilo</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8b7faa' }}>Dati biometrici e obiettivi di allenamento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Biometrics */}
        <div className="card p-5 space-y-4">
          <p className="section-label">Biometria</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>Altezza (cm)</label>
              <input
                type="number"
                value={profile.height_cm ?? ''}
                onChange={(e) => set('height_cm', Number(e.target.value))}
                placeholder="175"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>Data di nascita</label>
              <input
                type="date"
                value={profile.birth_date ?? ''}
                onChange={(e) => set('birth_date', e.target.value)}
                className="inp"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: '#8b7faa' }}>Sesso biologico</label>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('sex', opt.value as Profile['sex'])}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={profile.sex === opt.value
                    ? { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)', color: '#8b7faa' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Daily targets */}
        <div className="card p-5 space-y-4">
          <p className="section-label">Obiettivi Giornalieri</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>TDEE (kcal/giorno)</label>
              <input
                type="number"
                value={profile.tdee_kcal ?? ''}
                onChange={(e) => set('tdee_kcal', Number(e.target.value))}
                placeholder="2500"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>Proteine target (g)</label>
              <input
                type="number"
                value={profile.protein_g ?? ''}
                onChange={(e) => set('protein_g', Number(e.target.value))}
                placeholder="180"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>Carboidrati target (g)</label>
              <input
                type="number"
                value={profile.carbs_g ?? ''}
                onChange={(e) => set('carbs_g', Number(e.target.value))}
                placeholder="250"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#8b7faa' }}>Grassi target (g)</label>
              <input
                type="number"
                value={profile.fat_g ?? ''}
                onChange={(e) => set('fat_g', Number(e.target.value))}
                placeholder="70"
                className="inp"
              />
            </div>
          </div>

          {/* Macro preview bar */}
          {(profile.protein_g || profile.carbs_g || profile.fat_g) && (() => {
            const p = (profile.protein_g ?? 0) * 4
            const c = (profile.carbs_g ?? 0) * 4
            const f = (profile.fat_g ?? 0) * 9
            const total = p + c + f || 1
            return (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${(p / total) * 100}%`, background: '#60a5fa' }} />
                  <div style={{ width: `${(c / total) * 100}%`, background: '#fbbf24' }} />
                  <div style={{ width: `${(f / total) * 100}%`, background: '#f472b6' }} />
                </div>
                <div className="flex gap-4">
                  <span className="text-xs font-mono" style={{ color: '#60a5fa' }}>P {Math.round((p / total) * 100)}%</span>
                  <span className="text-xs font-mono" style={{ color: '#fbbf24' }}>C {Math.round((c / total) * 100)}%</span>
                  <span className="text-xs font-mono" style={{ color: '#f472b6' }}>F {Math.round((f / total) * 100)}%</span>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Goal phase */}
        <div className="card p-5 space-y-3">
          <p className="section-label">Fase di Obiettivo</p>
          <div className="space-y-2">
            {PHASES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('goal_phase', p.value as Profile['goal_phase'])}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={profile.goal_phase === p.value
                  ? { background: p.bg, border: `1px solid ${p.border}` }
                  : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.1)' }
                }
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: profile.goal_phase === p.value ? p.color : '#3d3459' }} />
                <div>
                  <span className="text-sm font-semibold" style={{ color: profile.goal_phase === p.value ? p.color : '#b8add2' }}>
                    {p.label}
                  </span>
                  <span className="text-xs ml-2" style={{ color: '#8b7faa' }}>{p.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvataggio...' : 'Salva profilo'}
          </button>
          {saved && (
            <span className="text-sm font-medium" style={{ color: '#4ade80' }}>
              Salvato
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
