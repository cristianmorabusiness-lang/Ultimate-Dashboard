import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface FoodResult {
  id: string; name: string; kcal_100g: number
  protein_100g: number; carbs_100g: number; fat_100g: number; fiber_100g: number
}

// ── OpenFoodFacts ─────────────────────────────────────────────────────────────

async function searchOFF(q: string, base: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: q, json: '1', page_size: '200', action: 'process',
    fields: 'code,product_name,product_name_it,nutriments', sort_by: 'unique_scans_n',
  })
  try {
    const res = await fetch(`${base}/cgi/search.pl?${params}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'HealthMentorApp/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.products ?? []).map((p: any) => {
      const n = p.nutriments ?? {}
      const name: string = p.product_name_it || p.product_name || ''
      if (!name.trim() || n['energy-kcal_100g'] == null) return null
      const kcal = Math.round(n['energy-kcal_100g'])
      if (kcal <= 0 || kcal > 1000) return null
      return {
        id: `off_${p.code ?? Math.random()}`,
        name: name.trim(),
        kcal_100g: kcal,
        protein_100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        carbs_100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        fiber_100g: Math.round((n['fiber_100g'] ?? 0) * 10) / 10,
      } as FoodResult
    }).filter(Boolean)
  } catch { return [] }
}

// ── USDA FoodData Central ─────────────────────────────────────────────────────
// Free key at https://fdc.nal.usda.gov/  →  add USDA_API_KEY to Vercel env vars
// Falls back to DEMO_KEY (30 req/hour) for testing

const NID = { energy: 1008, protein: 1003, carbs: 1005, fat: 1004, fiber: 1079 }

async function searchUSDA(q: string): Promise<FoodResult[]> {
  const key = process.env.USDA_API_KEY ?? 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&api_key=${key}&pageSize=200&dataType=Foundation,SR%20Legacy,Branded`
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.foods ?? []).map((f: any) => {
      const get = (id: number) => (f.foodNutrients ?? []).find((n: { nutrientId: number }) => n.nutrientId === id)?.value ?? 0
      const kcal = Math.round(get(NID.energy))
      if (!kcal || !f.description) return null
      return {
        id: `usda_${f.fdcId}`,
        name: f.description,
        kcal_100g: kcal,
        protein_100g: Math.round(get(NID.protein) * 10) / 10,
        carbs_100g: Math.round(get(NID.carbs) * 10) / 10,
        fat_100g: Math.round(get(NID.fat) * 10) / 10,
        fiber_100g: Math.round(get(NID.fiber) * 10) / 10,
      } as FoodResult
    }).filter(Boolean)
  } catch { return [] }
}

// ── Merge + deduplicate ───────────────────────────────────────────────────────

function merge(...lists: FoodResult[][]): FoodResult[] {
  const seen = new Set<string>()
  const out: FoodResult[] = []
  for (const list of lists) {
    for (const f of list) {
      const key = f.name.toLowerCase().replace(/\s+/g, ' ').slice(0, 40)
      if (!seen.has(key)) { seen.add(key); out.push(f) }
    }
  }
  return out
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const [it, world, usda] = await Promise.all([
    searchOFF(q, 'https://it.openfoodfacts.org'),
    searchOFF(q, 'https://world.openfoodfacts.org'),
    searchUSDA(q),
  ])

  return NextResponse.json({ results: merge(it, usda, world) })
}
