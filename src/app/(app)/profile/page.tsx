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
  { value: 'cut', label: 'Cut — caloric deficit, fat loss' },
  { value: 'bulk', label: 'Bulk — aggressive surplus, muscle gain' },
  { value: 'lean_bulk', label: 'Lean Bulk — controlled surplus' },
  { value: 'maintenance', label: 'Maintenance — caloric equilibrium' },
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
      if (!res.ok) setError(data.error ?? 'Save failed')
      else setSaved(true)
    } catch {
      setError('Network error')
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
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="text-neutral-400 text-sm">Your biometric profile and training goals</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Static biometrics */}
        <Section title="Biometrics">
          <Row label="Height (cm)">
            <NumberInput
              value={profile.height_cm ?? ''}
              onChange={(v) => set('height_cm', v)}
              placeholder="175"
            />
          </Row>
          <Row label="Date of birth">
            <input
              type="date"
              value={profile.birth_date ?? ''}
              onChange={(e) => set('birth_date', e.target.value)}
              className={inputClass}
            />
          </Row>
          <Row label="Sex">
            <select
              value={profile.sex ?? ''}
              onChange={(e) => set('sex', e.target.value as Profile['sex'])}
              className={inputClass}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Row>
        </Section>

        {/* Goals */}
        <Section title="Daily Targets">
          <Row label="TDEE (kcal/day)">
            <NumberInput value={profile.tdee_kcal ?? ''} onChange={(v) => set('tdee_kcal', v)} placeholder="2500" />
          </Row>
          <Row label="Protein target (g)">
            <NumberInput value={profile.protein_g ?? ''} onChange={(v) => set('protein_g', v)} placeholder="180" />
          </Row>
          <Row label="Carbs target (g)">
            <NumberInput value={profile.carbs_g ?? ''} onChange={(v) => set('carbs_g', v)} placeholder="250" />
          </Row>
          <Row label="Fat target (g)">
            <NumberInput value={profile.fat_g ?? ''} onChange={(v) => set('fat_g', v)} placeholder="70" />
          </Row>
        </Section>

        {/* Goal phase */}
        <Section title="Goal Phase">
          <div className="space-y-2">
            {PHASES.map((p) => (
              <label
                key={p.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  profile.goal_phase === p.value
                    ? 'border-emerald-700 bg-emerald-900/20'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                }`}
              >
                <input
                  type="radio"
                  name="goal_phase"
                  value={p.value}
                  checked={profile.goal_phase === p.value}
                  onChange={() => set('goal_phase', p.value as Profile['goal_phase'])}
                  className="accent-emerald-500"
                />
                <span className="text-sm text-neutral-200">{p.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          {saved && <span className="text-emerald-400 text-sm">Saved</span>}
        </div>
      </form>
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

function NumberInput({ value, onChange, placeholder }: {
  value: number | ''
  onChange: (v: number) => void
  placeholder: string
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={placeholder}
      className={inputClass}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
      <h2 className="text-sm font-medium text-neutral-300">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-neutral-400 w-44 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}
