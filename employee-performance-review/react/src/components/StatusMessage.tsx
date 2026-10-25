interface StatusMessageProps {
  message: string
  variant?: 'default' | 'success' | 'error'
}

// Always rendered, even when empty, so screen readers announce changes to it.
export function StatusMessage({ message, variant = 'default' }: StatusMessageProps) {
  return (
    <p className={variant === 'default' ? 'status' : `status ${variant}`} aria-live="polite">
      {message}
    </p>
  )
}
