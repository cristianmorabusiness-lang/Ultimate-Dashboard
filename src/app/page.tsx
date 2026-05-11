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
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-xl font-bold select-none">H</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Health Mentor</h1>
          <p className="text-neutral-400 text-sm mt-1">Personal performance dashboard</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-shadow"
              />
            </div>

            {status === 'error' && (
              <p className="text-red-400 text-xs">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email || !password}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              {status === 'loading' ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-neutral-600 text-xs mt-6">
          Accesso privato
        </p>
      </div>
    </main>
  )
}
