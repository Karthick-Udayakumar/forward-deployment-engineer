// "2026-01-01" / "2026-06-30" -> "Jan - Jun". Dates have no time zone, so they are read as UTC to avoid day shifts.
export function monthRange(start: string, end: string): string {
  const month = (value: string) =>
    new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(new Date(value))
  return `${month(start)} - ${month(end)}`
}

// "H1 2026 (Jan - Jun)"
export function periodLabel(name: string, start: string, end: string): string {
  return `${name} (${monthRange(start, end)})`
}

export function formatAverage(value: number): string {
  return value.toFixed(1)
}

// "2026-10-18T18:12:00" -> "18 Oct 2026, 18:12". Timestamps have no time zone, so they are read as local time.
export function formatTimestamp(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
