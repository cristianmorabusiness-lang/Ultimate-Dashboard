import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
    headers: { 'User-Agent': 'HealthMentorApp/1.0' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })

  const data = await res.json()
  if (data.status !== 1 || !data.product) {
    return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
  }

  const p = data.product
  const n = p.nutriments ?? {}

  const kcal = Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0)
  const protein = Math.round((n.proteins_100g ?? n.proteins ?? 0) * 10) / 10
  const carbs = Math.round((n.carbohydrates_100g ?? n.carbohydrates ?? 0) * 10) / 10
  const fat = Math.round((n.fat_100g ?? n.fat ?? 0) * 10) / 10
  const fiber = Math.round((n.fiber_100g ?? n.fiber ?? 0) * 10) / 10

  const name = p.product_name_it ?? p.product_name_en ?? p.product_name ?? `EAN ${code}`

  return NextResponse.json({
    result: {
      id: `off_${code}`,
      name: name.trim(),
      kcal_100g: kcal,
      protein_100g: protein,
      carbs_100g: carbs,
      fat_100g: fat,
      fiber_100g: fiber,
    },
  })
}
