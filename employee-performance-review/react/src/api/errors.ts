import { isApiError } from './client'
import type { ValidationErrorItem } from '../types'

// Plain-language messages for the validation errors the API can return
const VALIDATION_MESSAGES: Record<string, string> = {
  missing: 'This field is required.',
  string_too_long: 'Too long.',
  greater_than_equal: 'Too low.',
  less_than_equal: 'Too high.',
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
export function splitValidationErrors<F extends string>(
  items: ValidationErrorItem[],
  knownFields: readonly F[],
): { fieldErrors: Partial<Record<F, string>>; other: string[] } {
  const fieldErrors: Partial<Record<F, string>> = {}
  const other: string[] = []
  for (const item of items) {
    const key = String(item.loc.at(-1))
    if ((knownFields as readonly string[]).includes(key)) {
      fieldErrors[key as F] = VALIDATION_MESSAGES[item.type] ?? item.msg
    } else {
      other.push(item.msg)
    }
  }
  return { fieldErrors, other }
}
