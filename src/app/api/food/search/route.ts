import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const params = new URLSearchParams({
    search_terms: q,
    json: '1',
    page_size: '10',
    action: 'process',
    fields: 'code,product_name,nutriments',
    sort_by: 'unique_scans_n',
  })

  try {
    const res = await fetch(`${OFF_URL}?${params}`, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'HealthMentorApp/1.0 (personal use)' },
    })
    const data = await res.json()

    const results = (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
      .slice(0, 8)
      .map((p: any) => ({
        id: p.code ?? '',
        name: p.product_name,
        kcal_100g: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        protein_100g: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
        carbs_100g: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_100g: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
        fiber_100g: Math.round((p.nutriments['fiber_100g'] ?? 0) * 10) / 10,
      }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'Food search unavailable', results: [] }, { status: 502 })
  }
}
