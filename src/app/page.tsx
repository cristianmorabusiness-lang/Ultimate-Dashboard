'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setErrorMsg('Email o password errati.')
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Soft single-point accent glow at top */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 35% at 50% 0%, var(--accent-bg) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 mx-auto mb-5 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 32px var(--accent-bg-strong)' }}>
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h2.2L6.5 4.2 8 9.8l1.5-2.8H11" stroke="var(--accent-fg)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Health Mentor
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Dashboard personale · Accesso privato
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-elev)',
          }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }} htmlFor="email">Email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@esempio.com" required autoFocus autoComplete="email"
                className="inp"
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }} htmlFor="password">Password</label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                className="inp"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
            )}

            <button type="submit" disabled={status === 'loading' || !email || !password}
              className="btn-primary w-full py-2.5 mt-2">
              {status === 'loading'
                ? <><Spinner /> Accesso in corso...</>
                : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
          Accesso riservato · Health Mentor
        </p>
      </div>
    </main>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
