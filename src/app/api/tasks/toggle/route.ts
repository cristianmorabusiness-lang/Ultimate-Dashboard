import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TaskLog } from '@/lib/database.types'

/**
 * Set a task's state for a given day.
 *  - Recurring task: pass { def_id, logged_date, title, done?, skipped? }. We upsert
 *    the row manually (select-then-update/insert) because the uniqueness constraint
 *    is a partial index, which PostgREST's upsert can't target.
 *  - One-off task: pass { log_id, done?, skipped? }.
 * `skipped` marks the day as REST: it forces done=false and is excluded from the ring.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const skipped = Boolean(body.skipped)
  const done = skipped ? false : Boolean(body.done) // a rest day can't also be done
  const doneAt = done ? new Date().toISOString() : null

  // ── One-off task: update the existing log row by id ──
  if (body.log_id) {
    const { data: existing } = await supabase
      .from('task_log').select('id, user_id').eq('id', body.log_id).maybeSingle()
    const row = existing as { id: string; user_id: string } | null
    if (!row || row.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('task_log') as any
    const { data, error } = await table
      .update({ done, skipped, done_at: doneAt }).eq('id', body.log_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data as TaskLog })
  }

  // ── Recurring task: upsert the per-day completion row ──
  const { def_id, logged_date, title } = body as { def_id?: string; logged_date?: string; title?: string }
  if (!def_id || !logged_date) {
    return NextResponse.json({ error: 'def_id and logged_date (or log_id) are required' }, { status: 400 })
  }

  // Verify the def belongs to this user.
  const { data: defRow } = await supabase
    .from('task_defs').select('id, user_id, title').eq('id', def_id).maybeSingle()
  const def = defRow as { id: string; user_id: string; title: string } | null
  if (!def || def.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('task_log').select('id')
    .eq('user_id', user.id).eq('def_id', def_id).eq('logged_date', logged_date)
    .maybeSingle()
  const existingRow = existing as { id: string } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from('task_log') as any
  if (existingRow) {
    const { data, error } = await table
      .update({ done, skipped, done_at: doneAt }).eq('id', existingRow.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data as TaskLog })
  }

  const { data, error } = await table
    .insert({ user_id: user.id, def_id, logged_date, title: title ?? def.title, done, skipped, done_at: doneAt })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data as TaskLog }, { status: 201 })
}
