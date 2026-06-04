'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface FoodResult {
  id: string; name: string; kcal_100g: number
  protein_100g: number; carbs_100g: number; fat_100g: number; fiber_100g: number
}
interface MealItem {
  id: string; food_name: string; quantity_g: number
  kcal: number; protein_g: number; carbs_g: number; fat_g: number
}
interface Meal { id: string; meal_name: string; meal_order: number; items: MealItem[] }

const MEALS = [
  { name: 'Colazione',    icon: '☀️', order: 1 },
  { name: 'Pre-workout',  icon: '⚡', order: 2 },
  { name: 'Pranzo',       icon: '🕛', order: 3 },
  { name: 'Post-workout', icon: '💪', order: 4 },
  { name: 'Cena',         icon: '🌙', order: 5 },
  { name: 'Spuntino',     icon: '🍎', order: 6 },
]

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d)
}
function addDays(date: string, n: number) {
  const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return fmtDate(d)
}

// ── Barcode Scanner Component ──────────────────────────────────────────────────
function BarcodeModal({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error' | 'manual'>('starting')
  const [manualCode, setManualCode] = useState('')
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false)

  useEffect(() => {
    const supported = 'BarcodeDetector' in window
    setHasBarcodeDetector(supported)

    if (!supported) { setStatus('manual'); return }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('scanning')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })

        async function scan() {
          if (!videoRef.current) return
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const codes = await detector.detect(videoRef.current) as any[]
            if (codes.length > 0) {
              onDetect(codes[0].rawValue as string)
              return
            }
          } catch { /* ignore */ }
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      } catch {
        setStatus('error')
      }
    }

    startCamera()

    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetect])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden space-y-0"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-elev)' }}>

        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Scansiona Barcode</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--surface-soft)', color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {status === 'starting' && (
            <div className="h-40 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Avvio fotocamera...</p>
            </div>
          )}

          {status === 'scanning' && (
            <div className="relative rounded-xl overflow-hidden">
              <video ref={videoRef} className="w-full rounded-xl" style={{ maxHeight: '220px', objectFit: 'cover' }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-28 rounded-lg"
                  style={{ border: '2px solid var(--accent)', boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)' }} />
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center text-[11px]"
                style={{ color: 'var(--accent)' }}>Inquadra il barcode</p>
            </div>
          )}

          {status === 'error' && (
            <div className="h-24 rounded-xl flex flex-col items-center justify-center gap-2"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <p className="text-sm" style={{ color: 'var(--danger)' }}>Fotocamera non disponibile</p>
              <button onClick={() => setStatus('manual')} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
                Inserisci manualmente
              </button>
            </div>
          )}

          {(status === 'manual' || !hasBarcodeDetector) && (
            <div className="space-y-3">
              {!hasBarcodeDetector && (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Scansione automatica non supportata su questo browser (usa Chrome su Android).
                </p>
              )}
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Codice EAN / barcode</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="es. 8001120989680"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && manualCode.length >= 8 && onDetect(manualCode)}
                  className="inp w-full"
                  autoFocus
                />
              </div>
              <button
                onClick={() => manualCode.length >= 8 && onDetect(manualCode)}
                disabled={manualCode.length < 8}
                className="btn-primary w-full">
                Cerca prodotto
              </button>
            </div>
          )}

          {status === 'scanning' && (
            <button onClick={() => { cancelAnimationFrame(rafRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); setStatus('manual') }}
              className="w-full text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>
              Inserisci manualmente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LogMealsPage() {
  const todayStr = fmtDate(new Date())
  const [currentDate, setCurrentDate] = useState(todayStr)
  const [meals, setMeals] = useState<Meal[]>([])
  const [selectedMeal, setSelectedMeal] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [recentFoods, setRecentFoods] = useState<(FoodResult & { kcal_100g: number })[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [adding, setAdding] = useState(false)
  const [creatingMeal, setCreatingMeal] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [deletingMeal, setDeletingMeal] = useState<string | null>(null)

  const isToday = currentDate === todayStr
  const isFuture = currentDate > todayStr

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meals?date=${currentDate}`)
    const data = await res.json()
    if (data.meals) setMeals(data.meals)
    else setMeals([])
  }, [currentDate])

  useEffect(() => { loadMeals() }, [loadMeals])

  useEffect(() => {
    fetch('/api/food/recent').then((r) => r.json()).then((d) => {
      if (d.foods) setRecentFoods(d.foods.map((f: { name: string; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; fiber_100g: number }) => ({
        id: `recent_${f.name}`, name: f.name,
        kcal_100g: f.kcal_100g, protein_100g: f.protein_100g,
        carbs_100g: f.carbs_100g, fat_100g: f.fat_100g, fiber_100g: f.fiber_100g,
      })))
    })
  }, [])

  async function search(q?: string) {
    const sq = q ?? query
    if (!sq.trim()) return
    setSearching(true); setResults([]); setSelected(null); setBarcodeError('')
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(sq)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } finally { setSearching(false) }
  }

  async function handleBarcodeScan(code: string) {
    setShowScanner(false)
    setBarcodeLoading(true)
    setBarcodeError('')
    setSelected(null)
    setResults([])
    try {
      const res = await fetch(`/api/food/barcode?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.result) {
        setSelected(data.result)
        setQuery(data.result.name)
      } else {
        setBarcodeError(`Prodotto non trovato (${code})`)
      }
    } finally {
      setBarcodeLoading(false)
    }
  }

  async function ensureMeal(mealName: string): Promise<string> {
    const existing = meals.find((m) => m.meal_name === mealName)
    if (existing) return existing.id
    setCreatingMeal(mealName)
    const mealDef = MEALS.find((m) => m.name === mealName)
    const res = await fetch('/api/meals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_name: mealName, logged_date: currentDate, meal_order: mealDef?.order ?? 9 }),
    })
    const data = await res.json()
    setCreatingMeal(null); await loadMeals()
    return data.meal.id
  }

  async function addItem() {
    if (!selected || !selectedMeal || !quantity) return
    setAdding(true)
    const q = parseFloat(quantity); const factor = q / 100
    const mealId = await ensureMeal(selectedMeal)
    await fetch('/api/meals/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal_id: mealId, food_name: selected.name,
        off_product_id: selected.id.startsWith('off_') ? selected.id.replace('off_', '') : null,
        quantity_g: q,
        kcal: Math.round(selected.kcal_100g * factor),
        protein_g: Math.round(selected.protein_100g * factor * 10) / 10,
        carbs_g: Math.round(selected.carbs_100g * factor * 10) / 10,
        fat_g: Math.round(selected.fat_100g * factor * 10) / 10,
        fiber_g: Math.round(selected.fiber_100g * factor * 10) / 10,
      }),
    })
    setSelected(null); setQuery(''); setResults([]); setQuantity('100'); setBarcodeError('')
    await loadMeals(); setAdding(false)
  }

  function startEdit(item: MealItem) {
    setEditingItem(item.id)
    setEditQty(String(item.quantity_g))
  }

  async function saveEdit(item: MealItem) {
    const newQ = parseFloat(editQty)
    if (!Number.isFinite(newQ) || newQ <= 0) return
    setBusyItem(item.id)
    // Scale macros from the stored absolute values for the current quantity.
    const factor = newQ / item.quantity_g
    await fetch(`/api/meals/items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity_g: newQ,
        kcal: Math.round(item.kcal * factor),
        protein_g: Math.round(item.protein_g * factor * 10) / 10,
        carbs_g: Math.round(item.carbs_g * factor * 10) / 10,
        fat_g: Math.round(item.fat_g * factor * 10) / 10,
      }),
    })
    setEditingItem(null); setEditQty('')
    await loadMeals(); setBusyItem(null)
  }

  async function deleteItem(item: MealItem) {
    setBusyItem(item.id)
    await fetch(`/api/meals/items/${item.id}`, { method: 'DELETE' })
    await loadMeals(); setBusyItem(null)
  }

  async function deleteMeal(mealId: string) {
    setDeletingMeal(mealId)
    await fetch(`/api/meals/${mealId}`, { method: 'DELETE' })
    await loadMeals(); setDeletingMeal(null)
  }

  const totals = meals.flatMap((m) => m.items).reduce(
    (acc, i) => ({ kcal: acc.kcal + i.kcal, protein_g: acc.protein_g + i.protein_g, carbs_g: acc.carbs_g + i.carbs_g, fat_g: acc.fat_g + i.fat_g }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const pKcal = selected ? Math.round(selected.kcal_100g * parseFloat(quantity || '0') / 100) : 0
  const pProt = selected ? Math.round(selected.protein_100g * parseFloat(quantity || '0') / 100 * 10) / 10 : 0
  const pCarb = selected ? Math.round(selected.carbs_100g * parseFloat(quantity || '0') / 100 * 10) / 10 : 0
  const pFat  = selected ? Math.round(selected.fat_100g  * parseFloat(quantity || '0') / 100 * 10) / 10 : 0

  const dateLabel = new Date(currentDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  // ── Timing analysis ──
  const loggedMealNames = new Set(meals.map((m) => m.meal_name))
  const hasPreWorkout  = loggedMealNames.has('Pre-workout')
  const hasPostWorkout = loggedMealNames.has('Post-workout')
  const anabolicCovered = hasPreWorkout && hasPostWorkout

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-5">

      {showScanner && (
        <BarcodeModal
          onDetect={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Header + date navigation */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Pasti</h1>
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

      {/* Daily totals */}
      <div className="card p-3 md:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          { label: 'Calorie',  value: Math.round(totals.kcal),      unit: 'kcal', color: 'var(--macro-kcal)' },
          { label: 'Proteine', value: Math.round(totals.protein_g), unit: 'g',    color: 'var(--macro-protein)' },
          { label: 'Carbs',    value: Math.round(totals.carbs_g),   unit: 'g',    color: 'var(--macro-carbs)' },
          { label: 'Grassi',   value: Math.round(totals.fat_g),     unit: 'g',    color: 'var(--macro-fat)' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg py-2.5 px-2"
            style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
            <p className="font-mono text-lg md:text-xl font-medium" style={{ color: s.color }}>
              {s.value}<span className="text-xs ml-0.5" style={{ color: 'var(--text-dim)' }}>{s.unit}</span>
            </p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Timing: Finestra Anabolica ── */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Finestra Anabolica</p>
          {anabolicCovered
            ? <span className="pill pill-success">✓ Coperta</span>
            : <span className="pill pill-warning">Incompleta</span>
          }
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MEALS.map((m) => {
            const logged = loggedMealNames.has(m.name)
            const isKey = m.name === 'Pre-workout' || m.name === 'Post-workout'
            const mealData = meals.find((meal) => meal.meal_name === m.name)
            const mealKcal = mealData ? mealData.items.reduce((a, i) => a + i.kcal, 0) : 0
            const slotColor = logged
              ? isKey ? 'var(--success)' : 'var(--text-secondary)'
              : 'var(--text-dim)'
            return (
              <div key={m.name}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-center"
                style={{
                  background: logged
                    ? isKey ? 'var(--success-bg)' : 'var(--surface-soft)'
                    : 'transparent',
                  border: logged
                    ? isKey ? '1px solid var(--success-border)' : '1px solid var(--border)'
                    : isKey ? '1px dashed var(--warning-border)' : '1px solid var(--border)',
                }}>
                <span className="text-base" style={{ opacity: logged ? 1 : 0.35 }}>{m.icon}</span>
                <span className="text-[9px] leading-tight" style={{ color: slotColor }}>
                  {m.name.replace('-', '‑')}
                </span>
                {logged && mealKcal > 0 && (
                  <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{Math.round(mealKcal)}</span>
                )}
                {!logged && isKey && (
                  <span className="text-[9px]" style={{ color: 'var(--warning)' }}>!</span>
                )}
              </div>
            )
          })}
        </div>
        {!anabolicCovered && (hasPreWorkout || hasPostWorkout) && (
          <p className="text-[11px] mt-2.5" style={{ color: 'var(--text-muted)' }}>
            {!hasPreWorkout && '⚡ Manca il Pre-workout. '}
            {!hasPostWorkout && '💪 Manca il Post-workout.'}
            {' '}Carboidrati e proteine entro 1h prima e dopo il workout massimizzano il recupero.
          </p>
        )}
        {!anabolicCovered && !hasPreWorkout && !hasPostWorkout && meals.length > 0 && (
          <p className="text-[11px] mt-2.5" style={{ color: 'var(--text-muted)' }}>
            Aggiungi i pasti Pre-workout e Post-workout per coprire la finestra anabolica.
          </p>
        )}
      </div>

      {/* Add food */}
      <div className="card p-5 space-y-4">
        <p className="section-label">Aggiungi alimento</p>

        {/* Meal selector */}
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Pasto</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MEALS.map((m) => (
              <button key={m.name} onClick={() => setSelectedMeal(m.name)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all text-left"
                style={selectedMeal === m.name
                  ? { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }
                  : { background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <span>{m.icon}</span><span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + Barcode */}
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Cerca alimento</p>
          <div className="flex gap-2">
            <input type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="es. petto di pollo, riso, salmone..."
              className="inp flex-1" />
            <button
              onClick={() => setShowScanner(true)}
              title="Scansiona barcode"
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="2.5" height="16" fill="currentColor" />
                <rect x="6" y="4" width="1.5" height="16" fill="currentColor" opacity="0.7" />
                <rect x="9" y="4" width="3" height="16" fill="currentColor" />
                <rect x="14" y="4" width="1.5" height="16" fill="currentColor" opacity="0.7" />
                <rect x="17" y="4" width="2.5" height="16" fill="currentColor" />
                <rect x="21" y="4" width="1" height="16" fill="currentColor" opacity="0.5" />
              </svg>
            </button>
            <button onClick={() => search()} disabled={searching || !query.trim()} className="btn-primary whitespace-nowrap">
              {searching ? '...' : 'Cerca'}
            </button>
          </div>

          {barcodeLoading && (
            <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>Ricerca prodotto in corso...</p>
          )}
          {barcodeError && (
            <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{barcodeError}</p>
          )}

          {/* Recenti */}
          {!query && !selected && results.length === 0 && recentFoods.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Usati di recente</p>
              <div className="flex flex-wrap gap-1.5">
                {recentFoods.map((f) => (
                  <button key={f.id} onClick={() => setSelected(f)}
                    className="px-2.5 py-1 rounded-lg text-[11px] transition-colors text-left"
                    style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    {f.name}
                    <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>{f.kcal_100g}kcal</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div>
            <p className="text-[10px] mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {results.length} risultati
            </p>
            <div className="space-y-1 max-h-[480px] overflow-y-auto -mx-1 px-1">
              {results.map((r) => (
                <button key={r.id} onClick={() => setSelected(r)}
                  className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface-soft)'; el.style.borderColor = 'var(--border-strong)' }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.borderColor = 'transparent' }}>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{r.name}</p>
                  <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                    {r.kcal_100g} kcal · P {r.protein_100g}g · C {r.carbs_100g}g · G {r.fat_100g}g
                    <span className="ml-1" style={{ color: 'var(--text-dim)' }}>(per 100g)</span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected food */}
        {selected && (
          <div className="rounded-lg p-4 space-y-4"
            style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.name}</p>
                <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{selected.kcal_100g} kcal per 100g</p>
              </div>
              <button onClick={() => { setSelected(null); setResults([]); setBarcodeError('') }}
                className="text-[11px] px-2 py-1 rounded-lg"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-soft)' }}>
                Cambia
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Quantità (g)</p>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="inp w-full sm:w-28" />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center sm:flex-1 pb-0.5">
                {[
                  { label: 'kcal', value: pKcal, color: 'var(--macro-kcal)' },
                  { label: 'P',    value: pProt, color: 'var(--macro-protein)' },
                  { label: 'C',    value: pCarb, color: 'var(--macro-carbs)' },
                  { label: 'G',    value: pFat,  color: 'var(--macro-fat)' },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="font-mono text-sm font-medium" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={addItem} disabled={adding || !selectedMeal || !quantity} className="btn-primary w-full">
              {adding || creatingMeal ? 'Aggiunta...' : selectedMeal ? `Aggiungi a ${selectedMeal}` : 'Seleziona prima un pasto'}
            </button>
          </div>
        )}
      </div>

      {/* Meal logs */}
      {meals.map((meal) => {
        const mealDef = MEALS.find((m) => m.name === meal.meal_name)
        const mealTotals = meal.items.reduce(
          (acc, i) => ({ kcal: acc.kcal + i.kcal, protein_g: acc.protein_g + i.protein_g }),
          { kcal: 0, protein_g: 0 }
        )
        return (
          <div key={meal.id} className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">{mealDef?.icon ?? '🍽'}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{meal.meal_name}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {meal.items.length > 0 && (
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {Math.round(mealTotals.kcal)} kcal · P {Math.round(mealTotals.protein_g)}g
                  </span>
                )}
                <button onClick={() => deleteMeal(meal.id)} disabled={deletingMeal === meal.id}
                  title="Elimina pasto"
                  className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] transition-colors shrink-0"
                  style={{ background: 'var(--surface-soft)', color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--danger)'; el.style.background = 'var(--danger-bg)' }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'var(--surface-soft)' }}>
                  {deletingMeal === meal.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
            {meal.items.length === 0
              ? <p className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>Nessun alimento</p>
              : (
                <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
                  {meal.items.map((item) => (
                    <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 mr-1 flex-1">
                        <p className="text-sm truncate" style={{ color: 'var(--text)' }}>{item.food_name}</p>
                        {editingItem === item.id ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <input type="number" min="1" value={editQty} autoFocus
                              onChange={(e) => setEditQty(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(item); if (e.key === 'Escape') setEditingItem(null) }}
                              className="inp w-20 py-1 text-[13px]" />
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>g</span>
                            <button onClick={() => saveEdit(item)} disabled={busyItem === item.id}
                              className="text-[11px] px-2 py-1 rounded-md"
                              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}>
                              {busyItem === item.id ? '…' : 'Salva'}
                            </button>
                            <button onClick={() => setEditingItem(null)}
                              className="text-[11px] px-1.5 py-1" style={{ color: 'var(--text-muted)' }}>
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {item.quantity_g}g · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-sm" style={{ color: 'var(--macro-kcal)' }}>
                          {Math.round(item.kcal)}<span className="text-[10px] ml-0.5" style={{ color: 'var(--text-dim)' }}>kcal</span>
                        </span>
                        {editingItem !== item.id && (
                          <>
                            <button onClick={() => startEdit(item)} title="Modifica quantità"
                              className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--accent)'; el.style.background = 'var(--surface-soft)' }}
                              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}>
                              ✏️
                            </button>
                            <button onClick={() => deleteItem(item)} disabled={busyItem === item.id} title="Elimina alimento"
                              className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--danger)'; el.style.background = 'var(--danger-bg)' }}
                              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}>
                              {busyItem === item.id ? '…' : '✕'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )
      })}
    </div>
  )
}
