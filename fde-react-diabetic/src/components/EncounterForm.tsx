import { useState, type FormEvent } from 'react'
import { AGE_BRACKETS } from '../constants'
import type { AgeBracket, CodeOption, EncounterCreate, ReferenceCodes } from '../types'
import { FormField } from './FormField'
import { StatusMessage } from './StatusMessage'

// Values are kept as text, the way inputs report them. buildPayload converts them to the API shape.
export interface EncounterFormValues {
  patient_nbr: string
  age: string
  time_in_hospital: string
  number_inpatient: string
  number_emergency: string
  number_outpatient: string
  num_medications: string
  num_lab_procedures: string
  admission_type_id: string
  discharge_disposition_id: string
}

type FieldName = keyof EncounterFormValues

/** Message per field name, e.g. from a 422 response. */
export type EncounterFieldErrors = Partial<Record<FieldName, string>>

const EMPTY_VALUES: EncounterFormValues = {
  patient_nbr: '',
  age: '',
  time_in_hospital: '',
  number_inpatient: '',
  number_emergency: '',
  number_outpatient: '',
  num_medications: '',
  num_lab_procedures: '',
  admission_type_id: '',
  discharge_disposition_id: '',
}

const FIELD_NAMES = Object.keys(EMPTY_VALUES) as FieldName[]
const REQUIRED_FIELDS: FieldName[] = [
  'patient_nbr',
  'time_in_hospital',
  'number_inpatient',
  'number_emergency',
  'number_outpatient',
  'num_medications',
]
const COUNT_FIELDS: FieldName[] = [
  'time_in_hospital',
  'number_inpatient',
  'number_emergency',
  'number_outpatient',
  'num_medications',
  'num_lab_procedures',
]
const REQUIRED_MESSAGE = 'This field is required.'

// Checks the form in the browser, so most mistakes are caught before a request is sent
function validate(values: EncounterFormValues): EncounterFieldErrors {
  const errors: EncounterFieldErrors = {}
  for (const name of REQUIRED_FIELDS) {
    if (values[name].trim() === '') errors[name] = REQUIRED_MESSAGE
  }
  if (values.patient_nbr.trim().length > 50) {
    errors.patient_nbr = 'Must be 50 characters or fewer.'
  }
  for (const name of COUNT_FIELDS) {
    const raw = values[name].trim()
    if (raw === '' || errors[name]) continue
    const number = Number(raw)
    if (!Number.isInteger(number)) {
      errors[name] = 'Enter a whole number.'
    } else if (number < 0) {
      errors[name] = 'Must be 0 or more.'
    }
  }
  return errors
}

function optionalNumber(raw: string): number | null {
  return raw === '' ? null : Number(raw)
}

// Only called after validate() passes, so the required counts are whole numbers
function buildPayload(values: EncounterFormValues): EncounterCreate {
  return {
    patient_nbr: values.patient_nbr.trim(),
    time_in_hospital: Number(values.time_in_hospital),
    number_inpatient: Number(values.number_inpatient),
    number_emergency: Number(values.number_emergency),
    number_outpatient: Number(values.number_outpatient),
    num_medications: Number(values.num_medications),
    age: values.age === '' ? null : (values.age as AgeBracket),
    num_lab_procedures: optionalNumber(values.num_lab_procedures),
    admission_type_id: optionalNumber(values.admission_type_id),
    discharge_disposition_id: optionalNumber(values.discharge_disposition_id),
  }
}

const fieldId = (name: FieldName) => `enc-${name}`

interface EncounterFormProps {
  busy: boolean
  /** Dropdown options. null while they are loading. */
  referenceCodes: ReferenceCodes | null
  /** True when the reference list could not be loaded. Both code fields are optional, so the form still works. */
  referenceFailed: boolean
  /** Errors from the server, shown next to their fields. They stay until the next submit. */
  serverErrors?: EncounterFieldErrors
  /** Message under the form, e.g. a save failure. */
  message?: string
  onSubmit: (input: EncounterCreate) => void
  onCancel: () => void
}

export function EncounterForm({
  busy,
  referenceCodes,
  referenceFailed,
  serverErrors = {},
  message = '',
  onSubmit,
  onCancel,
}: EncounterFormProps) {
  const [values, setValues] = useState<EncounterFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<EncounterFieldErrors>({})

  // Errors from this form's own checks take precedence over server errors
  const fieldError = (name: FieldName) => errors[name] ?? serverErrors[name]
  const invalidCount = FIELD_NAMES.filter((name) => fieldError(name)).length
  const summary =
    invalidCount > 0
      ? `Please correct ${invalidCount} ${invalidCount === 1 ? 'field' : 'fields'} highlighted below.`
      : message

  // Editing a field clears its message straight away
  const setField = (name: FieldName, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const found = validate(values)
    setErrors(found)
    const first = FIELD_NAMES.find((name) => found[name])
    if (first) {
      document.getElementById(fieldId(first))?.focus()
      return
    }
    onSubmit(buildPayload(values))
  }

  const textInput = (name: FieldName, label: string, required: boolean, placeholder: string, maxLength?: number) => (
    <FormField id={fieldId(name)} label={label} required={required} error={fieldError(name)}>
      <input
        id={fieldId(name)}
        type="text"
        maxLength={maxLength}
        placeholder={placeholder}
        value={values[name]}
        onChange={(event) => setField(name, event.target.value)}
        className={fieldError(name) ? 'invalid' : undefined}
        aria-invalid={fieldError(name) ? true : undefined}
        data-testid={`input-${name}`}
      />
    </FormField>
  )

  const countInput = (name: FieldName, label: string, required: boolean, placeholder: string) => (
    <FormField id={fieldId(name)} label={label} required={required} error={fieldError(name)}>
      <input
        id={fieldId(name)}
        type="number"
        min={0}
        step={1}
        placeholder={placeholder}
        value={values[name]}
        onChange={(event) => setField(name, event.target.value)}
        className={fieldError(name) ? 'invalid' : undefined}
        aria-invalid={fieldError(name) ? true : undefined}
        data-testid={`input-${name}`}
      />
    </FormField>
  )

  // Dropdowns filled from the reference list. The value sent is the code number.
  const codeSelect = (name: FieldName, label: string, options: CodeOption[] | undefined) => {
    const placeholder = referenceFailed ? 'Could not load options' : options ? 'Not specified' : 'Loading…'
    return (
      <FormField id={fieldId(name)} label={label} error={fieldError(name)}>
        <select
          id={fieldId(name)}
          value={values[name]}
          disabled={!options}
          onChange={(event) => setField(name, event.target.value)}
          data-testid={`select-${name}`}
        >
          <option value="">{placeholder}</option>
          {(options ?? []).map((option) => (
            <option key={option.code} value={option.code}>
              {`${option.code} – ${option.label}`}
            </option>
          ))}
        </select>
      </FormField>
    )
  }

  return (
    <>
      <p className="form-note">Fields marked * are required. The encounter ID and risk score are assigned by the system.</p>
      <form className="form-grid" onSubmit={handleSubmit} noValidate data-testid="encounter-form">
        {textInput('patient_nbr', 'Patient Number / ID', true, 'e.g. 8222157', 50)}

        <FormField id={fieldId('age')} label="Age Bracket">
          <select
            id={fieldId('age')}
            value={values.age}
            onChange={(event) => setField('age', event.target.value)}
            data-testid="select-age"
          >
            <option value="">Select age group</option>
            {AGE_BRACKETS.map((bracket) => (
              <option key={bracket} value={bracket}>
                {bracket}
              </option>
            ))}
          </select>
        </FormField>

        {countInput('time_in_hospital', 'Time in Hospital (days)', true, 'e.g. 3')}
        {countInput('number_inpatient', 'Inpatient Visits', true, 'e.g. 1')}
        {countInput('number_emergency', 'Emergency Visits', true, 'e.g. 0')}
        {countInput('number_outpatient', 'Outpatient Visits', true, 'e.g. 2')}
        {countInput('num_medications', 'Number of Medications', true, 'e.g. 12')}
        {countInput('num_lab_procedures', 'Lab Procedures', false, 'e.g. 40')}
        {codeSelect('admission_type_id', 'Admission Type', referenceCodes?.admission_type_id)}
        {codeSelect('discharge_disposition_id', 'Discharge Disposition', referenceCodes?.discharge_disposition_id)}

        <div className="form-actions">
          <StatusMessage message={summary} variant="error" />
          <button type="button" className="secondary" onClick={onCancel} data-testid="btn-cancel">
            Cancel
          </button>
          <button type="submit" disabled={busy} data-testid="btn-save-encounter">
            {busy ? 'Saving…' : 'Add Record >'}
          </button>
        </div>
      </form>
    </>
  )
}
