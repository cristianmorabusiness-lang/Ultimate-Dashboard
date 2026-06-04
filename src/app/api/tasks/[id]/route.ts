import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Delete a one-off task (a task_log row with def_id = null).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: existing } = await supabase
    .from('task_log').select('id, user_id').eq('id', id).maybeSingle()
  const row = existing as { id: string; user_id: string } | null
  if (!row || row.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('task_log').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
