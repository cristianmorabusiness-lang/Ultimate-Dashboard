import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: mealsRaw } = await supabase
    .from('meals').select('id').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(60)

  const meals = (mealsRaw ?? []) as { id: string }[]
  if (!meals.length) return NextResponse.json({ foods: [] })

  const { data: itemsRaw } = await supabase
    .from('meal_items')
    .select('food_name, kcal, protein_g, carbs_g, fat_g, fiber_g, quantity_g, created_at')
    .in('meal_id', meals.map((m) => m.id))
    .order('created_at', { ascending: false })
    .limit(200)

  type ItemRow = { food_name: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number | null; quantity_g: number }
  const items = (itemsRaw ?? []) as ItemRow[]

  const seen = new Set<string>()
  const recent: {
    name: string; kcal_100g: number; protein_100g: number
    carbs_100g: number; fat_100g: number; fiber_100g: number
  }[] = []

  for (const item of items) {
    if (seen.has(item.food_name) || recent.length >= 15) continue
    seen.add(item.food_name)
    const f = 100 / Math.max(item.quantity_g, 1)
    recent.push({
      name: item.food_name,
      kcal_100g: Math.round(item.kcal * f),
      protein_100g: Math.round(item.protein_g * f * 10) / 10,
      carbs_100g: Math.round(item.carbs_g * f * 10) / 10,
      fat_100g: Math.round(item.fat_g * f * 10) / 10,
      fiber_100g: Math.round((item.fiber_g ?? 0) * f * 10) / 10,
    })
  }

  return NextResponse.json({ foods: recent })
}
