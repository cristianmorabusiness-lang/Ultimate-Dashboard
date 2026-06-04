'use client'

import { useEffect, useState, useCallback } from 'react'
import { TaskRing } from '@/components/dashboard/TaskRing'
import { taskCounts, type DayTask } from '@/lib/tasks'

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d)
}
function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return fmtDate(d)
}

export default function TasksPage() {
  const todayStr = fmtDate(new Date())
  const [currentDate, setCurrentDate] = useState(todayStr)
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [recurring, setRecurring] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const isToday = currentDate === todayStr
  const isFuture = currentDate > todayStr

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tasks?date=${currentDate}`)
    const data = await res.json()
    setTasks(data.tasks ?? [])
    setLoading(false)
  }, [currentDate])

  useEffect(() => { load() }, [load])

  const { done, active, skipped, total } = taskCounts(tasks)

  async function toggle(task: DayTask) {
    setBusyKey(task.key)
    const next = !task.done
    // optimistic — marking done clears any rest flag
    setTasks((ts) => ts.map((t) => (t.key === task.key ? { ...t, done: next, skipped: false } : t)))
    const body = task.recurring
      ? { def_id: task.def_id, logged_date: currentDate, title: task.title, done: next, skipped: false }
      : { log_id: task.log_id, done: next, skipped: false }
    await fetch('/api/tasks/toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await load()
    setBusyKey(null)
  }

  async function setRest(task: DayTask, value: boolean) {
    setBusyKey(task.key)
    // optimistic — a rest day is neither done nor missed
    setTasks((ts) => ts.map((t) => (t.key === task.key ? { ...t, skipped: value, done: false } : t)))
    const body = task.recurring
      ? { def_id: task.def_id, logged_date: currentDate, title: task.title, skipped: value, done: false }
      : { log_id: task.log_id, skipped: value, done: false }
    await fetch('/api/tasks/toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await load()
    setBusyKey(null)
  }

  async function addTask() {
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    if (recurring) {
      await fetch('/api/tasks/defs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, logged_date: currentDate }),
      })
    }
    setNewTitle('')
    await load()
    setAdding(false)
  }

  async function remove(task: DayTask) {
    setBusyKey(task.key)
    if (task.recurring) {
      // soft-delete the recurring definition (keeps history)
      await fetch(`/api/tasks/defs/${task.def_id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/tasks/${task.log_id}`, { method: 'DELETE' })
    }
    await load()
    setBusyKey(null)
  }

  const dateLabel = new Date(currentDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-5">

      {/* Header + date navigation */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Attività</h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>{dateLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentDate(addDays(currentDate, -1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            ‹
          </button>
          {!isToday && (
            <button onClick={() => setCurrentDate(todayStr)}
              className="px-2 h-8 rounded-lg text-[11px] transition-colors"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
              Oggi
            </button>
          )}
          <button onClick={() => { if (!isFuture) setCurrentDate(addDays(currentDate, 1)) }}
            disabled={isToday}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={isToday
              ? { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'not-allowed' }
              : { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            ›
          </button>
        </div>
      </div>

      {/* Progress ring */}
      <div className="card p-5 flex flex-col sm:flex-row items-center gap-5">
        <TaskRing done={done} total={active} size={132} stroke={12} />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {total === 0
              ? 'Nessuna attività'
              : active === 0
                ? 'Giorno di riposo 💤'
                : done === active ? 'Tutto fatto! 🎉' : `${done} / ${active} completate`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {total === 0
              ? 'Aggiungi la tua prima attività qui sotto.'
              : active === 0
                ? 'Tutte le attività di oggi sono in riposo.'
                : done === active
                  ? 'Hai completato tutte le attività di oggi.'
                  : `Ti mancano ${active - done} attività.`}
            {skipped > 0 && active > 0 && (
              <span style={{ color: 'var(--text-dim)' }}> · {skipped} in riposo 💤</span>
            )}
          </p>
        </div>
      </div>

      {/* Add task */}
      <div className="card p-5 space-y-3">
        <p className="section-label">Aggiungi attività</p>
        <div className="flex gap-2">
          <input type="text" value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="es. Palestra, Stretching, Bere 3L acqua..."
            className="inp flex-1" />
          <button onClick={addTask} disabled={adding || !newTitle.trim()} className="btn-primary whitespace-nowrap">
            {adding ? '...' : 'Aggiungi'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRecurring(true)}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] transition-all"
            style={recurring
              ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }
              : { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            🔁 Ricorrente <span className="opacity-70">(ogni giorno)</span>
          </button>
          <button onClick={() => setRecurring(false)}
            className="flex-1 px-3 py-2 rounded-lg text-[13px] transition-all"
            style={!recurring
              ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }
              : { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            📌 Solo oggi
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Lista attività</p>
        </div>
        {loading ? (
          <p className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
        ) : tasks.length === 0 ? (
          <p className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Nessuna attività per questo giorno.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
            {tasks.map((task) => (
              <div key={task.key} className="px-4 py-3 flex items-center gap-2.5">
                {task.skipped ? (
                  // Rest day: tap the 💤 to undo and bring the task back to "to do"
                  <button onClick={() => setRest(task, false)} disabled={busyKey === task.key} title="Annulla riposo"
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[12px] transition-all"
                    style={{ background: 'var(--surface-soft)', border: '1px dashed var(--border-strong)' }}>
                    💤
                  </button>
                ) : (
                  <button onClick={() => toggle(task)} disabled={busyKey === task.key}
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all"
                    style={task.done
                      ? { background: 'var(--success)', border: '1px solid var(--success)' }
                      : { background: 'transparent', border: '1.5px solid var(--border-strong)' }}>
                    {task.done && (
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7.5l3 3 6-6.5" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate"
                    style={{
                      color: task.done || task.skipped ? 'var(--text-muted)' : 'var(--text)',
                      textDecoration: task.done ? 'line-through' : 'none',
                    }}>
                    {task.title}
                    {task.skipped && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>· riposo</span>}
                  </p>
                </div>
                {/* Rest toggle — only meaningful for recurring tasks, and only when not already resting */}
                {task.recurring && !task.skipped && (
                  <button onClick={() => setRest(task, true)} disabled={busyKey === task.key} title="Segna come giorno di riposo"
                    className="h-6 px-1.5 flex items-center justify-center rounded-md text-[11px] transition-colors shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text)'; el.style.background = 'var(--surface-soft)' }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}>
                    💤 Riposo
                  </button>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'var(--surface-soft)', color: 'var(--text-dim)' }}>
                  {task.recurring ? '🔁' : '📌'}
                </span>
                <button onClick={() => remove(task)} disabled={busyKey === task.key} title={task.recurring ? 'Rimuovi dalla lista ricorrente' : 'Elimina'}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] transition-colors shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--danger)'; el.style.background = 'var(--danger-bg)' }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}>
                  {busyKey === task.key ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-center" style={{ color: 'var(--text-dim)' }}>
        🔁 Le attività ricorrenti riappaiono ogni giorno. 📌 Quelle &quot;solo oggi&quot; valgono per la data selezionata.
        <br />💤 &quot;Riposo&quot; esclude l&apos;attività dal conteggio per quel giorno (né fatta né mancata).
      </p>
    </div>
  )
}
