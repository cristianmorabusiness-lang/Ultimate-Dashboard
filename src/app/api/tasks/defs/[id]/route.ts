import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database, TaskDef } from '@/lib/database.types'

type TaskDefUpdate = Database['public']['Tables']['task_defs']['Update']

async function verifyOwnership(id: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('task_defs')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()
  const row = data as { id: string; user_id: string } | null
  if (!row || row.user_id !== userId) return null
  return row
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!await verifyOwnership(id, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const patch: TaskDefUpdate = {}
  if ('title' in body) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    patch.title = title
  }
  if ('active' in body) patch.active = Boolean(body.active)
  if ('sort_order' in body) patch.sort_order = Number(body.sort_order)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from('task_defs') as any
  const { data, error } = await table.update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ def: data as TaskDef })
}

// Soft-delete: deactivate the recurring task so its completion history is preserved.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!await verifyOwnership(id, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from('task_defs') as any
  const { error } = await table.update({ active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
