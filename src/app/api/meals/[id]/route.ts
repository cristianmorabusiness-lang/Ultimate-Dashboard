import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify ownership before deleting
  const { data: meal } = await supabase
    .from('meals')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // meal_items rows are removed via `on delete cascade` on the meal_id FK
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
