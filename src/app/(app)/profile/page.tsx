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
  wake_time: string | null
  workout_start: string | null
  workout_end: string | null
}

const PHASES = [
  { value: 'cut',         label: 'Cut',         desc: 'Deficit calorico — perdita di grasso', color: 'var(--phase-cut)',         bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.30)' },
  { value: 'bulk',        label: 'Bulk',        desc: 'Surplus aggressivo — massa muscolare', color: 'var(--phase-bulk)',        bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.30)' },
  { value: 'lean_bulk',   label: 'Lean Bulk',   desc: 'Surplus controllato — recomposizione', color: 'var(--phase-lean-bulk)',   bg: 'rgba(45,212,191,0.08)',  border: 'rgba(45,212,191,0.30)' },
  { value: 'maintenance', label: 'Maintenance', desc: 'Equilibrio calorico — mantenimento',   color: 'var(--phase-maintenance)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.30)' },
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-5">
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Profilo</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Dati biometrici e obiettivi di allenamento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Biometrics */}
        <div className="card p-5 space-y-4">
          <p className="section-label">Biometria</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Altezza (cm)</label>
              <input
                type="number"
                value={profile.height_cm ?? ''}
                onChange={(e) => set('height_cm', Number(e.target.value))}
                placeholder="175"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Data di nascita</label>
              <input
                type="date"
                value={profile.birth_date ?? ''}
                onChange={(e) => set('birth_date', e.target.value)}
                className="inp"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Sesso biologico</label>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('sex', opt.value as Profile['sex'])}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={profile.sex === opt.value
                    ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }
                    : { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
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
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>TDEE (kcal/giorno)</label>
              <input
                type="number"
                value={profile.tdee_kcal ?? ''}
                onChange={(e) => set('tdee_kcal', Number(e.target.value))}
                placeholder="2500"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Proteine target (g)</label>
              <input
                type="number"
                value={profile.protein_g ?? ''}
                onChange={(e) => set('protein_g', Number(e.target.value))}
                placeholder="180"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Carboidrati target (g)</label>
              <input
                type="number"
                value={profile.carbs_g ?? ''}
                onChange={(e) => set('carbs_g', Number(e.target.value))}
                placeholder="250"
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Grassi target (g)</label>
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
                  <div style={{ width: `${(p / total) * 100}%`, background: 'var(--macro-protein)' }} />
                  <div style={{ width: `${(c / total) * 100}%`, background: 'var(--macro-carbs)' }} />
                  <div style={{ width: `${(f / total) * 100}%`, background: 'var(--macro-fat)' }} />
                </div>
                <div className="flex gap-4">
                  <span className="text-xs font-mono" style={{ color: 'var(--macro-protein)' }}>P {Math.round((p / total) * 100)}%</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--macro-carbs)' }}>C {Math.round((c / total) * 100)}%</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--macro-fat)' }}>F {Math.round((f / total) * 100)}%</span>
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={profile.goal_phase === p.value
                  ? { background: p.bg, border: `1px solid ${p.border}` }
                  : { background: 'var(--surface-soft)', border: '1px solid var(--border)' }
                }
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: profile.goal_phase === p.value ? p.color : 'var(--text-dim)' }} />
                <div>
                  <span className="text-sm font-semibold" style={{ color: profile.goal_phase === p.value ? p.color : 'var(--text-secondary)' }}>
                    {p.label}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{p.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Routine */}
        <div className="card p-5 space-y-4">
          <p className="section-label">Routine Giornaliera</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Usata dall&apos;AI per contestualizzare i consigli</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Sveglia tipica</label>
              <input
                type="time"
                value={profile.wake_time ?? ''}
                onChange={(e) => set('wake_time', e.target.value || null)}
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Inizio allenamento</label>
              <input
                type="time"
                value={profile.workout_start ?? ''}
                onChange={(e) => set('workout_start', e.target.value || null)}
                className="inp"
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Fine allenamento</label>
              <input
                type="time"
                value={profile.workout_end ?? ''}
                onChange={(e) => set('workout_end', e.target.value || null)}
                className="inp"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvataggio...' : 'Salva profilo'}
          </button>
          {saved && (
            <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>
              ✓ Salvato
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
