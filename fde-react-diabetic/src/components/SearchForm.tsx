import { useState, type FormEvent } from 'react'
import { RISK_LEVEL_OPTIONS } from '../constants'
import type { RiskLevel } from '../types'
import { FormField } from './FormField'
import { StatusMessage } from './StatusMessage'

// Values are kept as the inputs report them. The page turns them into EncounterSearchParams.
export interface SearchFormValues {
  patientNbr: string
  riskLevel: RiskLevel | ''
  /** Text, so an empty box is distinct from 0. */
  riskScore: string
}

const EMPTY_VALUES: SearchFormValues = { patientNbr: '', riskLevel: '', riskScore: '' }

interface SearchFormProps {
  /** Pre-fills the form, e.g. from the address bar. */
  initialValues?: SearchFormValues
  busy: boolean
  /** Input problem to show under the form, e.g. "riskScore must be an integer between 0 and 8". */
  hint?: string
  onSearch: (values: SearchFormValues) => void
}

export function SearchForm({ initialValues = EMPTY_VALUES, busy, hint = '', onSearch }: SearchFormProps) {
  const [values, setValues] = useState<SearchFormValues>(initialValues)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(values)
  }

  return (
    <>
      <form
        className="form-grid"
        style={{ gridTemplateColumns: 'repeat(3, 1fr) auto', alignItems: 'end' }}
        onSubmit={handleSubmit}
        noValidate
        data-testid="search-form"
      >
        <FormField id="search-patient-nbr" label="Patient Number">
          <input
            id="search-patient-nbr"
            type="text"
            maxLength={50}
            placeholder="e.g. 8222157"
            value={values.patientNbr}
            onChange={(event) => setValues({ ...values, patientNbr: event.target.value })}
            data-testid="input-patient-nbr"
          />
        </FormField>
        <FormField id="search-risk-level" label="Risk Level">
          <select
            id="search-risk-level"
            value={values.riskLevel}
            onChange={(event) => setValues({ ...values, riskLevel: event.target.value as RiskLevel | '' })}
            data-testid="select-risk-level"
          >
            <option value="">Any</option>
            {RISK_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="search-risk-score" label="Risk Score">
          <input
            id="search-risk-score"
            type="number"
            min={0}
            max={8}
            step={1}
            placeholder="0 to 8"
            value={values.riskScore}
            onChange={(event) => setValues({ ...values, riskScore: event.target.value })}
            data-testid="input-risk-score"
          />
        </FormField>
        <div>
          <button type="submit" disabled={busy} data-testid="btn-search">
            {busy ? 'Searching…' : 'Search >'}
          </button>
        </div>
      </form>
      <StatusMessage message={hint} variant="error" />
    </>
  )
}
