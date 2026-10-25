import type { ReactNode } from 'react'

interface FormFieldProps {
  /** id of the input inside children, so the label points at it. */
  id: string
  label: string
  required?: boolean
  /** Message shown under the field. The space is reserved even when empty, so the layout does not jump. */
  error?: string
  children: ReactNode
}

// Label, input and error text for one form field.
export function FormField({ id, label, required = false, error, children }: FormFieldProps) {
  return (
    <div>
      <label className={required ? 'required' : undefined} htmlFor={id}>
        {label}
      </label>
      {children}
      <p className="field-error" id={`${id}-error`}>
        {error}
      </p>
    </div>
  )
}
