/** Formatting helpers for "minutes since midnight today" timestamps. */

export function clock(t: number): string {
  const day = ((t % 1440) + 1440) % 1440
  const h24 = Math.floor(day / 60)
  const m = day % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** "10:42 AM" for today, "Yesterday, 11:34 PM" for negative values */
export function when(t: number): string {
  return t < 0 ? `Yesterday, ${clock(t)}` : clock(t)
}

/** 193 -> "3 h 13 min", 24 -> "24 min" */
export function duration(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

/** 193 -> "3 hours" (for headlines, rounded down) */
export function roughHours(mins: number): string {
  const h = Math.floor(mins / 60)
  if (h < 1) return duration(mins)
  return h === 1 ? 'an hour' : `${h} hours`
}
