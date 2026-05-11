'use client'

import { useEffect, useState, useCallback } from 'react'

interface FoodResult {
  id: string
  name: string
  kcal_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g: number
}

interface MealItem {
  id: string
  food_name: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface Meal {
  id: string
  meal_name: string
  meal_order: number
  items: MealItem[]
}

const MEALS = [
  { name: 'Colazione', icon: '☀️', order: 1 },
  { name: 'Pranzo', icon: '🕛', order: 2 },
  { name: 'Cena', icon: '🌙', order: 3 },
  { name: 'Spuntino', icon: '🍎', order: 4 },
  { name: 'Pre-workout', icon: '⚡', order: 5 },
  { name: 'Post-workout', icon: '💪', order: 6 },
]

const SEARCH_SUGGESTIONS = [
  'Petto di pollo', 'Salmone', 'Uova', 'Riso', 'Pasta', 'Avena',
  'Broccoli', 'Spinaci', 'Patate dolci', 'Mandorle', 'Tonno', 'Manzo',
]

export default function LogMealsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [meals, setMeals] = useState<Meal[]>([])
  const [selectedMeal, setSelectedMeal] = useState<string>('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [adding, setAdding] = useState(false)
  const [creatingMeal, setCreatingMeal] = useState<string | null>(null)

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meals?date=${today}`)
    const data = await res.json()
    if (data.meals) setMeals(data.meals)
  }, [today])

  useEffect(() => { loadMeals() }, [loadMeals])

  async function search(q?: string) {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return
    setSearching(true)
    setResults([])
    setSelected(null)
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function ensureMeal(mealName: string): Promise<string> {
    const existing = meals.find((m) => m.meal_name === mealName)
    if (existing) return existing.id
    setCreatingMeal(mealName)
    const mealDef = MEALS.find((m) => m.name === mealName)
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_name: mealName, logged_date: today, meal_order: mealDef?.order ?? 9 }),
    })
    const data = await res.json()
    setCreatingMeal(null)
    await loadMeals()
    return data.meal.id
  }

  async function addItem() {
    if (!selected || !selectedMeal || !quantity) return
    setAdding(true)
    const q = parseFloat(quantity)
    const factor = q / 100
    const mealId = await ensureMeal(selectedMeal)
    await fetch('/api/meals/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal_id: mealId,
        food_name: selected.name,
        off_product_id: selected.id,
        quantity_g: q,
        kcal: Math.round(selected.kcal_100g * factor),
        protein_g: Math.round(selected.protein_100g * factor * 10) / 10,
        carbs_g: Math.round(selected.carbs_100g * factor * 10) / 10,
        fat_g: Math.round(selected.fat_100g * factor * 10) / 10,
        fiber_g: Math.round(selected.fiber_100g * factor * 10) / 10,
      }),
    })
    setSelected(null)
    setQuery('')
    setResults([])
    setQuantity('100')
    await loadMeals()
    setAdding(false)
  }

  const totals = meals.flatMap((m) => m.items).reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const previewKcal = selected ? Math.round(selected.kcal_100g * parseFloat(quantity || '0') / 100) : 0
  const previewProtein = selected ? Math.round(selected.protein_100g * parseFloat(quantity || '0') / 100 * 10) / 10 : 0
  const previewCarbs = selected ? Math.round(selected.carbs_100g * parseFloat(quantity || '0') / 100 * 10) / 10 : 0
  const previewFat = selected ? Math.round(selected.fat_100g * parseFloat(quantity || '0') / 100 * 10) / 10 : 0

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: '#f1eeff' }}>Pasti</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b5f8a' }}>{today}</p>
      </div>

      {/* Daily totals */}
      <div className="card p-4 grid grid-cols-4 gap-3 text-center">
        {[
          { label: 'Calorie', value: Math.round(totals.kcal), unit: 'kcal', color: '#a78bfa' },
          { label: 'Proteine', value: Math.round(totals.protein_g), unit: 'g', color: '#60a5fa' },
          { label: 'Carbs', value: Math.round(totals.carbs_g), unit: 'g', color: '#fbbf24' },
          { label: 'Grassi', value: Math.round(totals.fat_g), unit: 'g', color: '#f472b6' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl py-3 px-2"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(109,40,217,0.15)' }}>
            <p className="font-mono text-xl font-medium" style={{ color: s.color }}>
              {s.value}<span className="text-xs ml-0.5" style={{ color: '#4a4268' }}>{s.unit}</span>
            </p>
            <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: '#4a4268' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add food */}
      <div className="card p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#4a4268' }}>
          Aggiungi alimento
        </p>

        {/* Meal selector */}
        <div>
          <p className="text-xs mb-2" style={{ color: '#6b5f8a' }}>Pasto</p>
          <div className="grid grid-cols-3 gap-2">
            {MEALS.map((m) => (
              <button
                key={m.name}
                onClick={() => setSelectedMeal(m.name)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] transition-all text-left"
                style={selectedMeal === m.name ? {
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.4)',
                  color: '#d8b4fe',
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(109,40,217,0.15)',
                  color: '#6b5f8a',
                }}
              >
                <span>{m.icon}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div>
          <p className="text-xs mb-2" style={{ color: '#6b5f8a' }}>Cerca alimento</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="es. petto di pollo, riso, salmone..."
              className="inp flex-1"
            />
            <button onClick={() => search()} disabled={searching || !query.trim()} className="btn-primary whitespace-nowrap">
              {searching ? '...' : 'Cerca'}
            </button>
          </div>

          {/* Suggestions */}
          {!query && !selected && results.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SEARCH_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); search(s) }}
                  className="px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                  style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(109,40,217,0.2)', color: '#8b7eb8' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div className="space-y-1 max-h-52 overflow-y-auto -mx-1 px-1">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                style={{ border: '1px solid transparent' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(124,58,237,0.08)'
                  el.style.borderColor = 'rgba(109,40,217,0.2)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'transparent'
                  el.style.borderColor = 'transparent'
                }}
              >
                <p className="text-sm" style={{ color: '#f1eeff' }}>{r.name}</p>
                <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#6b5f8a' }}>
                  {r.kcal_100g} kcal · P {r.protein_100g}g · C {r.carbs_100g}g · G {r.fat_100g}g &nbsp;(per 100g)
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Selected food + quantity */}
        {selected && (
          <div className="rounded-2xl p-4 space-y-4"
            style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f1eeff' }}>{selected.name}</p>
                <p className="text-[11px] mt-0.5 font-mono" style={{ color: '#6b5f8a' }}>
                  {selected.kcal_100g} kcal per 100g
                </p>
              </div>
              <button onClick={() => { setSelected(null); setResults([]) }}
                className="text-[11px] px-2 py-1 rounded-lg transition-colors"
                style={{ color: '#6b5f8a', background: 'rgba(255,255,255,0.04)' }}>
                Cambia
              </button>
            </div>

            <div className="flex items-end gap-4">
              <div>
                <p className="text-xs mb-1.5" style={{ color: '#6b5f8a' }}>Quantità (g)</p>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="inp w-28"
                />
              </div>
              {/* Macro preview */}
              <div className="flex-1 grid grid-cols-4 gap-2 text-center pb-0.5">
                {[
                  { label: 'kcal', value: previewKcal, color: '#a78bfa' },
                  { label: 'P', value: previewProtein, color: '#60a5fa' },
                  { label: 'C', value: previewCarbs, color: '#fbbf24' },
                  { label: 'G', value: previewFat, color: '#f472b6' },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="font-mono text-sm font-medium" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px]" style={{ color: '#4a4268' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={addItem}
              disabled={adding || !selectedMeal || !quantity}
              className="btn-primary w-full"
            >
              {adding || creatingMeal
                ? 'Aggiunta...'
                : selectedMeal
                  ? `Aggiungi a ${selectedMeal}`
                  : 'Seleziona prima un pasto'}
            </button>
          </div>
        )}
      </div>

      {/* Meal logs */}
      {meals.map((meal) => {
        const mealDef = MEALS.find((m) => m.name === meal.meal_name)
        const mealTotals = meal.items.reduce(
          (acc, item) => ({ kcal: acc.kcal + item.kcal, protein_g: acc.protein_g + item.protein_g }),
          { kcal: 0, protein_g: 0 }
        )
        return (
          <div key={meal.id} className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(109,40,217,0.15)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">{mealDef?.icon ?? '🍽'}</span>
                <span className="text-sm font-semibold" style={{ color: '#d8b4fe' }}>{meal.meal_name}</span>
              </div>
              {meal.items.length > 0 && (
                <span className="font-mono text-[11px]" style={{ color: '#6b5f8a' }}>
                  {Math.round(mealTotals.kcal)} kcal · P {Math.round(mealTotals.protein_g)}g
                </span>
              )}
            </div>
            {meal.items.length === 0 ? (
              <p className="p-4 text-xs" style={{ color: '#4a4268' }}>Nessun alimento</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(109,40,217,0.08)' }}>
                {meal.items.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{ color: '#e2d9f3' }}>{item.food_name}</p>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: '#4a4268' }}>
                        {item.quantity_g}g · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g
                      </p>
                    </div>
                    <span className="font-mono text-sm" style={{ color: '#a78bfa' }}>
                      {Math.round(item.kcal)}<span className="text-[10px] ml-0.5" style={{ color: '#4a4268' }}>kcal</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
