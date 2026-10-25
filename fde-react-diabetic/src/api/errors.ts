import { isApiError } from './client'
import type { EncounterFieldErrors } from '../components/EncounterForm'
import type { ValidationErrorItem } from '../types'

// Field names the API can report in a 422 response. They match the keys of EncounterFieldErrors.
const ENCOUNTER_FIELDS: string[] = [
  'patient_nbr',
  'age',
  'time_in_hospital',
  'number_inpatient',
  'number_emergency',
  'number_outpatient',
  'num_medications',
  'num_lab_procedures',
  'admission_type_id',
  'discharge_disposition_id',
]

// Plain-language messages for the validation errors the API can return
const VALIDATION_MESSAGES: Record<string, string> = {
  missing: 'This field is required.',
  string_too_long: 'Must be 50 characters or fewer.',
  greater_than_equal: 'Must be 0 or more.',
  int_parsing: 'Enter a whole number.',
  int_type: 'Enter a whole number.',
  int_from_float: 'Enter a whole number.',
}

/** Message for a failed load, using the API's message when there is one. */
export function describeError(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback
}

/** Message for a failed save or update, e.g. "Update failed: ...". */
export function failureText(action: string, error: unknown): string {
  return isApiError(error) ? `${action} failed: ${error.message}` : `${action} failed. Please try again.`
}

/** Splits a 422 response into messages for individual form fields and messages for the form as a whole. */
export function splitValidationErrors(items: ValidationErrorItem[]): { fieldErrors: EncounterFieldErrors; other: string[] } {
  const fieldErrors: EncounterFieldErrors = {}
  const other: string[] = []
  for (const item of items) {
    const key = String(item.loc.at(-1))
    if (ENCOUNTER_FIELDS.includes(key)) {
      fieldErrors[key as keyof EncounterFieldErrors] = VALIDATION_MESSAGES[item.type] ?? item.msg
    } else {
      other.push(item.msg)
    }
  }
  return { fieldErrors, other }
}
