import { useState, type FormEvent } from 'react'
import { READMISSION_OPTIONS } from '../constants'
import { outcomeLabel } from '../format'
import type { ReadmissionValue } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { FormField } from './FormField'

interface OutcomeFormProps {
  /** The 30-day outcome saved on the server. null if not recorded yet. */
  current: ReadmissionValue | null
  busy: boolean
  /** overwrite is true only when the user has confirmed changing a recorded outcome. */
  onSave: (value: ReadmissionValue, overwrite: boolean) => void
}

// Records the 30-day outcome. It does not change the risk score.
// Give this component a new `key` when the saved outcome changes, so the form starts from the new value.
export function OutcomeForm({ current, busy, onSave }: OutcomeFormProps) {
  const [chosen, setChosen] = useState<ReadmissionValue | ''>(current ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Saving is possible only when the user picks a different value
  const canSave = chosen !== '' && chosen !== current

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || chosen === '' || chosen === current) return
    // Changing a recorded outcome needs an explicit confirmation first
    if (current !== null) {
      setConfirmOpen(true)
    } else {
      onSave(chosen, false)
    }
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    if (chosen !== '') onSave(chosen, true)
  }

  // Keep the saved value on screen
  const handleCancelConfirm = () => {
    setConfirmOpen(false)
    setChosen(current ?? '')
  }

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit} noValidate data-testid="outcome-form">
        <FormField id="outcome-readmitted" label="Readmitted">
          <select
            id="outcome-readmitted"
            value={chosen}
            onChange={(event) => setChosen(event.target.value as ReadmissionValue | '')}
            data-testid="select-readmitted"
          >
            <option value="">{current === null ? 'Not recorded yet' : 'Choose an outcome'}</option>
            {READMISSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <div className="form-actions">
          <button type="submit" disabled={busy || !canSave} data-testid="btn-outcome">
            Save outcome
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        message={
          current === null || chosen === ''
            ? ''
            : `The outcome is already recorded as "${outcomeLabel(current)}". Change it to "${outcomeLabel(chosen)}"?`
        }
        confirmLabel="Change outcome"
        cancelLabel="Keep current"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </>
  )
}
