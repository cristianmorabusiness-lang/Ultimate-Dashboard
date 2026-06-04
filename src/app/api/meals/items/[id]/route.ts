import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, MealItem } from '@/lib/database.types'

type MealItemUpdate = Database['public']['Tables']['meal_items']['Update']

async function verifyOwnership(itemId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('meal_items')
    .select('id, meal_id, meals!inner(user_id)')
    .eq('id', itemId)
    .maybeSingle()
  const row = data as { id: string; meal_id: string; meals: { user_id: string } } | null
  if (!row || row.meals.user_id !== userId) return null
  return row
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await verifyOwnership(id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const patch: MealItemUpdate = {}
  if ('quantity_g' in body) {
    const q = Number(body.quantity_g)
    if (!Number.isFinite(q) || q <= 0) {
      return NextResponse.json({ error: 'quantity_g must be a positive number' }, { status: 400 })
    }
    patch.quantity_g = q
  }
  if ('kcal' in body) patch.kcal = Number(body.kcal)
  if ('protein_g' in body) patch.protein_g = Number(body.protein_g)
  if ('carbs_g' in body) patch.carbs_g = Number(body.carbs_g)
  if ('fat_g' in body) patch.fat_g = Number(body.fat_g)
  if ('fiber_g' in body) patch.fiber_g = body.fiber_g == null || body.fiber_g === '' ? null : Number(body.fiber_g)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from('meal_items') as any
  const { data: updated, error } = await table
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: updated as MealItem })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const owned = await verifyOwnership(id, user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('meal_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
