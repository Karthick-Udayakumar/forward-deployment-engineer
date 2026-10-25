import { READMISSION_OPTIONS, TEAM_ROLES } from './constants'
import type { InterventionStatus, ReadmissionValue } from './types'

// "PENDING_REVIEW" -> "PENDING REVIEW". No status means no intervention has been created yet.
export function statusLabel(status: InterventionStatus | null): string {
  return status ? status.replace(/_/g, ' ') : 'Not started'
}

export function teamLabel(value: string | null): string {
  if (!value) return 'Unassigned'
  return TEAM_ROLES.find((role) => role.value === value)?.label ?? value
}

export function outcomeLabel(value: ReadmissionValue | null): string {
  return READMISSION_OPTIONS.find((option) => option.value === value)?.label ?? 'Not recorded'
}

// "2026-10-18T18:12:00" -> "18 Oct 2026, 18:12". Timestamps have no time zone, so they are read as local time.
export function formatTimestamp(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
