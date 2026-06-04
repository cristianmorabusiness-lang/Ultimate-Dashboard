import type { TaskDef, TaskLog } from '@/lib/database.types'

export interface DayTask {
  key: string
  title: string
  done: boolean
  /** Marked as a rest day: excluded from the progress ring (neither done nor missed) */
  skipped: boolean
  recurring: boolean
  def_id: string | null
  log_id: string | null
  sort_order: number
}

/**
 * Merge active recurring defs with the day's log rows for a single date.
 *  - Each active def is a task; its `done` comes from a matching log row (else false).
 *  - One-off tasks are log rows with def_id = null.
 */
export function mergeDayTasks(defs: TaskDef[], logs: TaskLog[], date: string): DayTask[] {
  const logByDef = new Map<string, TaskLog>()
  const oneOff: TaskLog[] = []
  for (const l of logs) {
    if (l.logged_date !== date) continue
    if (l.def_id) logByDef.set(l.def_id, l)
    else oneOff.push(l)
  }

  const recurring: DayTask[] = defs
    .filter((d) => d.active)
    .map((d) => {
      const log = logByDef.get(d.id)
      return {
        key: `def:${d.id}`,
        title: d.title,
        done: log?.done ?? false,
        skipped: log?.skipped ?? false,
        recurring: true,
        def_id: d.id,
        log_id: log?.id ?? null,
        sort_order: d.sort_order,
      }
    })

  const single: DayTask[] = oneOff.map((l) => ({
    key: `log:${l.id}`,
    title: l.title,
    done: l.done,
    skipped: l.skipped,
    recurring: false,
    def_id: null,
    log_id: l.id,
    sort_order: l.sort_order,
  }))

  return [...recurring, ...single].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Progress-ring counts. Rest-day (skipped) tasks are excluded from the
 * denominator so they count neither as done nor as missed.
 */
export function taskCounts(tasks: DayTask[]) {
  const done = tasks.filter((t) => t.done && !t.skipped).length
  const skipped = tasks.filter((t) => t.skipped).length
  const active = tasks.length - skipped // tasks that actually need doing today
  return { done, skipped, active, total: tasks.length }
}
