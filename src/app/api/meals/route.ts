import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Meal, MealItem } from '@/lib/database.types'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { data: mealsRaw } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', user.id)
    .eq('logged_date', date)
    .order('meal_order', { ascending: true })

  const meals = (mealsRaw ?? []) as Meal[]
  if (meals.length === 0) return NextResponse.json({ meals: [] })

  const mealIds = meals.map((m) => m.id)
  const { data: itemsRaw } = await supabase
    .from('meal_items')
    .select('*')
    .in('meal_id', mealIds)
    .order('created_at', { ascending: true })

  const items = (itemsRaw ?? []) as MealItem[]
  const result = meals.map((meal) => ({
    ...meal,
    items: items.filter((item) => item.meal_id === meal.id),
  }))

  return NextResponse.json({ meals: result })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { meal_name, logged_date, meal_order } = await request.json()
  if (!logged_date) return NextResponse.json({ error: 'logged_date is required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mealRaw, error } = await supabase
    .from('meals')
    .insert({ user_id: user.id, logged_date, meal_name: meal_name ?? 'Meal', meal_order: meal_order ?? 1 } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const meal = mealRaw as Meal
  return NextResponse.json({ meal }, { status: 201 })
}
