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
      <div className="shrink-0 px-4 md:px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(109,40,217,0.2)' }}>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight" style={{ color: '#ede9fe' }}>
            Coach AI
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b5f8a' }}>
            Conosce la tua storia completa — chiedi qualsiasi cosa
          </p>
        </div>
        <button onClick={reset}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(109,40,217,0.2)', color: '#8b7faa' }}>
          Nuova chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mr-2.5 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 12px rgba(124,58,237,0.3)' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L9.5 5.5H12L8.5 8L10 13L7 10L4 13L5.5 8L2 5.5H4.5L7 1Z" fill="white" />
                </svg>
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user' ? {
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                color: '#ede9fe',
                borderBottomRightRadius: '4px',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(109,40,217,0.15)',
                color: '#c4b5fd',
                borderBottomLeftRadius: '4px',
              }}
            >
              {m.content}
              {m.role === 'assistant' && m.content === '' && loading && (
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#7c3aed', animationDelay: `${j * 0.15}s` }} />
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
          <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: '#4a4268' }}>Domande frequenti</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="px-3 py-1.5 rounded-xl text-xs transition-all text-left"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(109,40,217,0.2)', color: '#8b7faa' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#d8b4fe'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#8b7faa'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(109,40,217,0.2)'
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-t" style={{ borderColor: 'rgba(109,40,217,0.15)' }}>
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
            style={{ opacity: !input.trim() || loading ? 0.5 : 1 }}
          >
            Invia
          </button>
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: '#3d3459' }}>
          Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  )
}
