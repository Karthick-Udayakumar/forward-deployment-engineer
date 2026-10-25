import { useState, type FormEvent } from 'react'
import {
  CRITERIA,
  MAX_COMMENT_LENGTH,
  REVIEW_FIELDS,
  type CriterionKey,
  type ReviewFieldErrors,
  type ReviewFieldName,
} from '../constants'
import { periodLabel } from '../format'
import type { Employee, ReviewCreate, ReviewPeriod } from '../types'
import { FormField } from './FormField'
import { StarRating } from './StarRating'
import { StatusMessage } from './StatusMessage'

// Values are kept as text/numbers the way inputs report them. buildPayload converts them to the API shape.
interface ReviewFormValues {
  employee_id: string
  period_id: string
  quality_rating: number // 0 = not chosen yet
  delivery_rating: number
  teamwork_rating: number
  comments: string
}

type FieldName = ReviewFieldName

const EMPTY_VALUES: ReviewFormValues = {
  employee_id: '',
  period_id: '',
  quality_rating: 0,
  delivery_rating: 0,
  teamwork_rating: 0,
  comments: '',
}

const REQUIRED_MESSAGE = 'This field is required.'

// Checks the form in the browser, so most mistakes are caught before a request is sent
function validate(values: ReviewFormValues): ReviewFieldErrors {
  const errors: ReviewFieldErrors = {}
  if (values.employee_id === '') errors.employee_id = REQUIRED_MESSAGE
  if (values.period_id === '') errors.period_id = REQUIRED_MESSAGE
  for (const { key } of CRITERIA) {
    if (values[key] === 0) errors[key] = 'Choose a rating from 1 to 5.'
  }
  if (values.comments.trim() === '') errors.comments = REQUIRED_MESSAGE
  else if (values.comments.trim().length > MAX_COMMENT_LENGTH) errors.comments = `Must be ${MAX_COMMENT_LENGTH} characters or fewer.`
  return errors
}

// Only called after validate() passes
function buildPayload(values: ReviewFormValues): ReviewCreate {
  return {
    employee_id: Number(values.employee_id),
    period_id: Number(values.period_id),
    quality_rating: values.quality_rating,
    delivery_rating: values.delivery_rating,
    teamwork_rating: values.teamwork_rating,
    comments: values.comments.trim(),
  }
}

const fieldId = (name: FieldName) => `review-${name}`

interface ReviewFormProps {
  busy: boolean
  /** Dropdown options. null while they are loading. */
  employees: Employee[] | null
  /** Open periods only. null while loading. */
  periods: ReviewPeriod[] | null
  /** True when the dropdown lists could not be loaded. The form cannot be submitted without them. */
  lookupsFailed: boolean
  /** Errors from the server, shown next to their fields. They stay until the next submit. */
  serverErrors?: ReviewFieldErrors
  /** Message under the form, e.g. a save failure. */
  message?: string
  onSubmit: (input: ReviewCreate) => void
  onCancel: () => void
}

export function ReviewForm({
  busy,
  employees,
  periods,
  lookupsFailed,
  serverErrors = {},
  message = '',
  onSubmit,
  onCancel,
}: ReviewFormProps) {
  const [values, setValues] = useState<ReviewFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<ReviewFieldErrors>({})

  // Errors from this form's own checks take precedence over server errors
  const fieldError = (name: FieldName) => errors[name] ?? serverErrors[name]
  const invalidCount = REVIEW_FIELDS.filter((name) => fieldError(name)).length
  const summary =
    invalidCount > 0
      ? `Please correct ${invalidCount} ${invalidCount === 1 ? 'field' : 'fields'} highlighted below.`
      : lookupsFailed
        ? 'Could not load employees and review periods. Reload the page to try again.'
        : message

  // Editing a field clears its message straight away
  const setField = <K extends FieldName>(name: K, value: ReviewFormValues[K]) => {
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const found = validate(values)
    setErrors(found)
    const first = REVIEW_FIELDS.find((name) => found[name])
    if (first) {
      document.getElementById(fieldId(first))?.focus()
      return
    }
    onSubmit(buildPayload(values))
  }

  const reset = () => {
    setValues(EMPTY_VALUES)
    setErrors({})
  }

  const placeholder = (list: unknown[] | null, what: string) =>
    lookupsFailed ? 'Could not load options' : list ? `Select ${what}` : 'Loading…'

  return (
    <>
      <p className="form-note">Fields marked * are required. The average rating is calculated by the system.</p>
      <form className="form-grid" onSubmit={handleSubmit} noValidate data-testid="review-form">
        <FormField id={fieldId('employee_id')} label="Employee" required error={fieldError('employee_id')}>
          <select
            id={fieldId('employee_id')}
            value={values.employee_id}
            disabled={!employees}
            onChange={(event) => setField('employee_id', event.target.value)}
            className={fieldError('employee_id') ? 'invalid' : undefined}
            aria-invalid={fieldError('employee_id') ? true : undefined}
            data-testid="select-employee"
          >
            <option value="">{placeholder(employees, 'employee')}</option>
            {(employees ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>
                {`${employee.employee_id} - ${employee.name}`}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id={fieldId('period_id')} label="Review Period" required error={fieldError('period_id')}>
          <select
            id={fieldId('period_id')}
            value={values.period_id}
            disabled={!periods}
            onChange={(event) => setField('period_id', event.target.value)}
            className={fieldError('period_id') ? 'invalid' : undefined}
            aria-invalid={fieldError('period_id') ? true : undefined}
            data-testid="select-period"
          >
            <option value="">{placeholder(periods, 'period')}</option>
            {(periods ?? []).map((period) => (
              <option key={period.id} value={period.id}>
                {periodLabel(period.name, period.start_date, period.end_date)}
              </option>
            ))}
          </select>
        </FormField>

        <fieldset className="ratings">
          <legend>Performance Ratings (1 - 5)</legend>
          {CRITERIA.map(({ key, label }) => (
            <FormField key={key} id={fieldId(key)} label={label} required error={fieldError(key)}>
              <StarRating
                id={fieldId(key)}
                label={label}
                value={values[key]}
                onChange={(next) => setField(key as CriterionKey, next)}
                invalid={Boolean(fieldError(key))}
              />
            </FormField>
          ))}
        </fieldset>

        <FormField id={fieldId('comments')} label="Overall Comments" required error={fieldError('comments')}>
          <textarea
            id={fieldId('comments')}
            rows={5}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Enter your feedback, strengths, areas of improvement…"
            value={values.comments}
            onChange={(event) => setField('comments', event.target.value)}
            className={fieldError('comments') ? 'invalid' : undefined}
            aria-invalid={fieldError('comments') ? true : undefined}
            data-testid="input-comments"
          />
        </FormField>

        <div className="form-actions">
          <StatusMessage message={summary} variant="error" />
          <button type="button" className="secondary" onClick={onCancel} data-testid="btn-cancel">
            Cancel
          </button>
          <button type="button" className="secondary" onClick={reset} disabled={busy} data-testid="btn-reset">
            Reset
          </button>
          <button type="submit" disabled={busy || lookupsFailed} data-testid="btn-submit-review">
            {busy ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </form>
    </>
  )
}
