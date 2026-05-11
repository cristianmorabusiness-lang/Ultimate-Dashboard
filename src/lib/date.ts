const TZ = 'Europe/Rome'

/** Returns a date in YYYY-MM-DD format in Italian timezone */
export function localDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

/** Returns the date N days ago in YYYY-MM-DD format in Italian timezone */
export function daysAgo(n: number): string {
  return localDate(new Date(Date.now() - n * 86400000))
}

/** Returns the most recent Monday in YYYY-MM-DD format in Italian timezone */
export function lastMonday(): string {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(now)
  const dayMap: Record<string, number> = {
    Sunday: 6, Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5,
  }
  return daysAgo(dayMap[weekday] ?? 0)
}
