import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TaskDef, TaskLog } from '@/lib/database.types'
import { mergeDayTasks } from '@/lib/tasks'
import { localDate } from '@/lib/date'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? localDate()

  const [defsRes, logsRes] = await Promise.all([
    supabase.from('task_defs')
      .select('*').eq('user_id', user.id).eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('task_log')
      .select('*').eq('user_id', user.id).eq('logged_date', date),
  ])

  if (defsRes.error) console.error('[tasks] defs query failed:', defsRes.error.message)
  if (logsRes.error) console.error('[tasks] log query failed:', logsRes.error.message)

  const defs = (defsRes.data ?? []) as TaskDef[]
  const logs = (logsRes.data ?? []) as TaskLog[]
  const tasks = mergeDayTasks(defs, logs, date)
  const done = tasks.filter((t) => t.done).length

  return NextResponse.json({ tasks, done, total: tasks.length })
}

// Add a one-off task for a single date.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const logged_date = body.logged_date as string | undefined
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (!logged_date) return NextResponse.json({ error: 'logged_date is required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('task_log')
    .insert({ user_id: user.id, def_id: null, logged_date, title, done: false } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data as TaskLog }, { status: 201 })
}
