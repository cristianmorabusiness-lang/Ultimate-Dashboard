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
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#08080f' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #4f46e5)', boxShadow: '0 0 32px rgba(139,92,246,0.35)' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L14.5 8.5H20L15.5 12.5L17.5 20L11 16L4.5 20L6.5 12.5L2 8.5H7.5L11 2Z" fill="white" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>
            Health Mentor
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#8b7faa' }}>Dashboard personale · Accesso privato</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: '#0e0e1f', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.08)' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#b8add2' }} htmlFor="email">Email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@esempio.com" required autoFocus autoComplete="email"
                className="inp"
              />
            </div>

            <div>
              <label className="block text-sm mb-1.5" style={{ color: '#b8add2' }} htmlFor="password">Password</label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                className="inp"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm" style={{ color: '#f87171' }}>{errorMsg}</p>
            )}

            <button type="submit" disabled={status === 'loading' || !email || !password}
              className="btn-primary w-full py-2.5 mt-2">
              {status === 'loading'
                ? <><Spinner /> Accesso in corso...</>
                : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#5e5479' }}>
          Accesso riservato · Health Mentor
        </p>
      </div>
    </main>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
