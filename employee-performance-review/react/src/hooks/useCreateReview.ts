import { useState } from 'react'
import { createReview, isApiError } from '../api/client'
import { describeError, splitValidationErrors } from '../api/errors'
import { REVIEW_FIELDS, type ReviewFieldErrors } from '../constants'
import type { ReviewCreate, ValidationErrorItem } from '../types'

/**
 * Submits a new review. `onSaved` runs with the saved review's id after a successful save.
 * Server validation errors are split into per-field messages and form-level messages.
 */
export function useCreateReview(onSaved: (reviewId: number) => void) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [serverErrors, setServerErrors] = useState<ReviewFieldErrors>({})

  const save = async (input: ReviewCreate) => {
    setBusy(true)
    setMessage('')
    setServerErrors({})
    try {
      const saved = await createReview(input)
      onSaved(saved.id)
    } catch (error) {
      if (isApiError(error) && error.status === 422 && Array.isArray(error.detail)) {
        const { fieldErrors, other } = splitValidationErrors(error.detail as ValidationErrorItem[], REVIEW_FIELDS)
        setServerErrors(fieldErrors)
        setMessage(other.length > 0 ? other.join(' ') : 'The server rejected the review. Check the values and try again.')
      } else if (isApiError(error) && error.status === 409) {
        // Closed period or duplicate review: the server's message says which
        setMessage(typeof error.detail === 'string' ? error.detail : 'This review conflicts with an existing one.')
      } else if (isApiError(error) && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')) {
        setMessage("Can't reach the server right now. Check that the API is running, then try again.")
      } else {
        setMessage(describeError(error, 'Something unexpected went wrong. Please try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return { save, busy, message, serverErrors }
}
