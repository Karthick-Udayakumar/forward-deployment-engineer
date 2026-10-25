import { useState, type FormEvent } from 'react'
import { INTERVENTION_STATUS_OPTIONS, TEAM_ROLES } from '../constants'
import type { InterventionDetail, InterventionStatus, InterventionUpdate } from '../types'
import { FormField } from './FormField'

interface InterventionFormProps {
  /** The saved intervention. The form starts from these values. */
  item: InterventionDetail
  busy: boolean
  onSubmit: (update: InterventionUpdate) => void
}

// Workflow status, owner and notes. Every field is sent on save, because the API overwrites all three.
// Give this component a new `key` when the saved intervention changes, so the form starts from the new values.
export function InterventionForm({ item, busy, onSubmit }: InterventionFormProps) {
  // Before the first update there is no status yet, so start from PENDING_REVIEW
  const [status, setStatus] = useState<InterventionStatus>(item.status ?? 'PENDING_REVIEW')
  const [assignedTo, setAssignedTo] = useState(item.assigned_to ?? '')
  const [notes, setNotes] = useState(item.notes ?? '')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedNotes = notes.trim()
    onSubmit({
      status,
      assigned_to: assignedTo === '' ? null : assignedTo,
      notes: trimmedNotes === '' ? null : trimmedNotes,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate data-testid="intervention-form">
      <FormField id="intervention-encounter-id" label="Encounter ID">
        <input id="intervention-encounter-id" type="text" readOnly value={item.encounter_id} data-testid="input-encounter-id" />
      </FormField>
      <FormField id="intervention-patient-nbr" label="Patient No">
        <input id="intervention-patient-nbr" type="text" readOnly value={item.patient_nbr} data-testid="input-patient-nbr" />
      </FormField>
      <FormField id="intervention-status" label="Status">
        <select
          id="intervention-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as InterventionStatus)}
          data-testid="select-status"
        >
          {INTERVENTION_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="intervention-assigned-to" label="Assigned To">
        <select
          id="intervention-assigned-to"
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          data-testid="select-assigned-to"
        >
          <option value="">Unassigned</option>
          {TEAM_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </FormField>
      <div className="full">
        <FormField id="intervention-notes" label="Notes">
          <textarea
            id="intervention-notes"
            maxLength={2000}
            placeholder="Follow-up details, next steps…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            data-testid="input-notes"
          />
        </FormField>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={busy} data-testid="btn-update">
          {busy ? 'Saving…' : 'Update >'}
        </button>
      </div>
    </form>
  )
}
