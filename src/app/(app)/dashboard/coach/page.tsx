'use client'

import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

const WELCOME: Message = {
  role: 'assistant',
  content: 'Ciao! Sono il tuo coach AI. Ho accesso alla tua storia completa di allenamenti, peso e nutrizione. Cosa vuoi sapere o ottimizzare oggi?',
}

const SUGGESTIONS = [
  'Perché non sto crescendo di massa?',
  'Cosa mangio dopo l\'allenamento di oggi?',
  'Sono in bulk o cut in questo momento?',
  'Come posso migliorare il recupero?',
  'Analizza il mio trend di peso delle ultime 2 settimane',
]

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.body) throw new Error('No stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        aiText += decoder.decode(value, { stream: true })
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: aiText },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Errore di connessione. Riprova.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function reset() {
    setMessages([WELCOME])
    setInput('')
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] md:max-h-screen">
      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Coach AI
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Conosce la tua storia completa — chiedi qualsiasi cosa
          </p>
        </div>
        <button onClick={reset} className="btn-ghost text-xs px-3 py-1.5">
          Nuova chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mr-2.5 mt-0.5"
                style={{ background: 'var(--accent)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06) inset' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h2.2L6.5 4.2 8 9.8l1.5-2.8H11" stroke="var(--accent-fg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user' ? {
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                color: 'var(--text)',
                borderBottomRightRadius: '4px',
              } : {
                background: 'var(--surface-soft)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderBottomLeftRadius: '4px',
              }}
            >
              {m.content}
              {m.role === 'assistant' && m.content === '' && loading && (
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--accent)', animationDelay: `${j * 0.15}s` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (shown only at start) */}
      {messages.length === 1 && (
        <div className="shrink-0 px-4 md:px-6 pb-3">
          <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Domande frequenti</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="btn-ghost text-xs px-3 py-1.5">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 md:px-6 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Scrivi al coach... (Invio per inviare)"
            rows={1}
            className="flex-1 inp resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-primary shrink-0 px-4 py-2.5"
          >
            Invia
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-dim)' }}>
          Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  )
}
