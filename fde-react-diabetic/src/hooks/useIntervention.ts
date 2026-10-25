import { useEffect, useState } from 'react'
import { getIntervention, isApiError, updateIntervention, updateReadmission } from '../api/client'
import { failureText } from '../api/errors'
import type { InterventionDetail, InterventionUpdate, ReadmissionValue } from '../types'

export interface Notice {
  text: string
  variant: 'default' | 'success' | 'error'
}

const NO_NOTICE: Notice = { text: '', variant: 'default' }

/**
 * One encounter's intervention: loads it while `active`, and saves the workflow fields and the 30-day outcome.
 * After each save the record is reloaded, so the forms show what the server stored.
 */
export function useIntervention(encounterId: string | null, active: boolean) {
  const [loaded, setLoaded] = useState<InterventionDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [version, setVersion] = useState(0) // bumped after each save to reload the record
  const [updateBusy, setUpdateBusy] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<Notice>(NO_NOTICE)
  const [outcomeBusy, setOutcomeBusy] = useState(false)
  const [outcomeMessage, setOutcomeMessage] = useState<Notice>(NO_NOTICE)

  useEffect(() => {
    if (!active || encounterId === null) return
    const controller = new AbortController()
    getIntervention(encounterId, { signal: controller.signal })
      .then((item) => {
        setLoaded(item)
        setLoadError('')
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(
          isApiError(caught) && caught.status === 404
            ? `Encounter ${encounterId} was not found.`
            : 'Could not load this encounter. Please try again.',
        )
      })
    return () => controller.abort()
  }, [active, encounterId, version])

  // Ignore a record left over from a previously opened encounter
  const detail = loaded !== null && loaded.encounter_id === encounterId ? loaded : null

  const saveIntervention = async (update: InterventionUpdate) => {
    if (encounterId === null) return
    setUpdateBusy(true)
    setUpdateMessage({ text: 'Saving…', variant: 'default' })
    try {
      const result = await updateIntervention(encounterId, update)
      setUpdateMessage({ text: result.message, variant: 'success' })
      setVersion((current) => current + 1)
    } catch (error) {
      setUpdateMessage({ text: failureText('Update', error), variant: 'error' })
    } finally {
      setUpdateBusy(false)
    }
  }

  const saveOutcome = async (value: ReadmissionValue, overwrite: boolean) => {
    if (encounterId === null) return
    setOutcomeBusy(true)
    setOutcomeMessage({ text: 'Saving…', variant: 'default' })
    try {
      await updateReadmission(encounterId, { readmitted: value, overwrite })
      setOutcomeMessage({ text: 'Outcome saved.', variant: 'success' })
      setVersion((current) => current + 1)
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        setOutcomeMessage({
          text: 'Another user recorded an outcome while you were editing. Reload the page to see it.',
          variant: 'error',
        })
      } else {
        setOutcomeMessage({ text: failureText('Save', error), variant: 'error' })
      }
    } finally {
      setOutcomeBusy(false)
    }
  }

  /** Clears the loaded record and messages, before opening a different encounter. */
  const reset = () => {
    setLoaded(null)
    setLoadError('')
    setUpdateMessage(NO_NOTICE)
    setOutcomeMessage(NO_NOTICE)
  }

  return {
    detail,
    loadError,
    updateBusy,
    updateMessage,
    outcomeBusy,
    outcomeMessage,
    saveIntervention,
    saveOutcome,
    reset,
  }
}
