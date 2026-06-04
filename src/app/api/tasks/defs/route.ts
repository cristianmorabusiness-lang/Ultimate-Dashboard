import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TaskDef } from '@/lib/database.types'

// Create a recurring checklist definition (appears every day).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // Append to the end of the current list.
  const { data: last } = await supabase
    .from('task_defs')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('task_defs')
    .insert({ user_id: user.id, title, sort_order: nextOrder } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ def: data as TaskDef }, { status: 201 })
}
