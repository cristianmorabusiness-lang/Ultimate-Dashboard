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

const MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

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

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`)
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
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meal_name: mealName, logged_date: today, meal_order: MEAL_NAMES.indexOf(mealName) + 1 }),
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

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Log Meals</h1>
        <p className="text-neutral-400 text-sm">{today}</p>
      </div>

      {/* Daily totals */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 grid grid-cols-4 gap-4 text-center">
        {[
          { label: 'Calories', value: `${Math.round(totals.kcal)}`, unit: 'kcal' },
          { label: 'Protein', value: `${Math.round(totals.protein_g)}`, unit: 'g' },
          { label: 'Carbs', value: `${Math.round(totals.carbs_g)}`, unit: 'g' },
          { label: 'Fat', value: `${Math.round(totals.fat_g)}`, unit: 'g' },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-lg font-semibold text-white">{stat.value}<span className="text-xs text-neutral-500 ml-0.5">{stat.unit}</span></p>
            <p className="text-xs text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Add food */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-neutral-300">Add food</h2>

        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Meal</label>
          <select
            value={selectedMeal}
            onChange={(e) => setSelectedMeal(e.target.value)}
            className={inp}
          >
            <option value="">Select meal...</option>
            {MEAL_NAMES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search food (e.g. chicken breast, oats)"
            className={`${inp} flex-1`}
          />
          <button
            onClick={search}
            disabled={searching || !query.trim()}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {results.length > 0 && !selected && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <p className="text-sm text-white">{r.name}</p>
                <p className="text-xs text-neutral-500">
                  {r.kcal_100g} kcal · P {r.protein_100g}g · C {r.carbs_100g}g · F {r.fat_100g}g (per 100g)
                </p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">{selected.name}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {selected.kcal_100g} kcal per 100g
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-neutral-500 hover:text-neutral-300 text-xs">
                Change
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-neutral-400 mb-1">Quantity (g)</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={`${inp} w-28`}
                />
              </div>
              <div className="text-xs text-neutral-400 space-y-0.5 pt-4">
                <p>{Math.round(selected.kcal_100g * parseFloat(quantity || '0') / 100)} kcal</p>
                <p>P {Math.round(selected.protein_100g * parseFloat(quantity || '0') / 100 * 10) / 10}g</p>
              </div>
            </div>
            <button
              onClick={addItem}
              disabled={adding || !selectedMeal || !quantity}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {adding || creatingMeal ? 'Adding...' : `Add to ${selectedMeal || 'meal'}`}
            </button>
          </div>
        )}
      </div>

      {/* Meal log */}
      {meals.map((meal) => (
        <div key={meal.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h3 className="text-sm font-medium text-neutral-300">{meal.meal_name}</h3>
          </div>
          {meal.items.length === 0 ? (
            <p className="p-4 text-xs text-neutral-600">No items yet</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {meal.items.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-800/50">
                    <td className="p-3 text-neutral-200">{item.food_name}</td>
                    <td className="p-3 text-right text-neutral-400 text-xs">{item.quantity_g}g</td>
                    <td className="p-3 text-right text-neutral-300 text-xs">{Math.round(item.kcal)} kcal</td>
                    <td className="p-3 text-right text-neutral-500 text-xs">P {item.protein_g}g</td>
                    <td className="p-3 text-right text-neutral-500 text-xs">C {item.carbs_g}g</td>
                    <td className="p-3 text-right text-neutral-500 text-xs">F {item.fat_g}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  )
}

const inp = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
