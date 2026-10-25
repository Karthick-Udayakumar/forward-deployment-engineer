import { useState } from 'react'
import { createEncounter, isApiError } from '../api/client'
import { describeError, splitValidationErrors } from '../api/errors'
import type { EncounterFieldErrors } from '../components/EncounterForm'
import type { EncounterCreate, ValidationErrorItem } from '../types'

/**
 * Saves a new encounter. `onSaved` runs with the new encounter_id after a successful save.
 * Server validation errors are split into per-field messages and form-level messages.
 */
export function useCreateEncounter(onSaved: (encounterId: string) => void) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [serverErrors, setServerErrors] = useState<EncounterFieldErrors>({})

  const save = async (input: EncounterCreate) => {
    setBusy(true)
    setMessage('')
    setServerErrors({})
    try {
      const saved = await createEncounter(input)
      onSaved(saved.encounter_id)
    } catch (error) {
      if (isApiError(error) && error.status === 422 && Array.isArray(error.detail)) {
        const { fieldErrors, other } = splitValidationErrors(error.detail as ValidationErrorItem[])
        setServerErrors(fieldErrors)
        setMessage(other.length > 0 ? other.join(' ') : 'The server rejected the record. Check the values and try again.')
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
