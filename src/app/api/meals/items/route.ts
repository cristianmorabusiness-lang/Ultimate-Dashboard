import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MealItem } from '@/lib/database.types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { meal_id, food_name, off_product_id, quantity_g, kcal, protein_g, carbs_g, fat_g, fiber_g } = body

  if (!meal_id || !food_name || !quantity_g) {
    return NextResponse.json({ error: 'meal_id, food_name, and quantity_g are required' }, { status: 400 })
  }

  // Verify the meal belongs to this user
  const { data: mealRaw } = await supabase.from('meals').select('user_id').eq('id', meal_id).maybeSingle()
  const meal = mealRaw as { user_id: string } | null
  if (!meal || meal.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemRaw, error } = await supabase
    .from('meal_items')
    .insert({
      meal_id,
      food_name,
      off_product_id: off_product_id ?? null,
      quantity_g,
      kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g: fiber_g ?? null,
    } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const item = itemRaw as MealItem
  return NextResponse.json({ item }, { status: 201 })
}
