'use client'

import { useState } from 'react'

interface Props {
  lastSyncedAt: string | null
}

export function WhoopSyncButton({ lastSyncedAt }: Props) {
  const [status, setStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSync() {
    setStatus('syncing')
    setMessage('')
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Errore sconosciuto')
      } else {
        setStatus('ok')
        setMessage(`${data.records} record sincronizzati`)
        setTimeout(() => setStatus('idle'), 4000)
      }
    } catch {
      setStatus('error')
      setMessage('Errore di rete')
    }
  }

  const syncedLabel = lastSyncedAt
    ? new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(lastSyncedAt))
    : null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={
          status === 'ok'
            ? { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }
            : status === 'error'
            ? { background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }
            : { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }
        }
      >
        {status === 'syncing' ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
            Sync...
          </>
        ) : status === 'ok' ? (
          <>✓ {message}</>
        ) : status === 'error' ? (
          <>✗ {message}</>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Sync WHOOP
          </>
        )}
      </button>
      {syncedLabel && status === 'idle' && (
        <span className="text-[10px]" style={{ color: '#4a4268' }}>
          {syncedLabel}
        </span>
      )}
    </div>
  )
}
