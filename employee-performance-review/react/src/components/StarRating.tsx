import { MAX_RATING } from '../constants'

interface StarRatingProps {
  /** Current rating, 0 when none is chosen yet. */
  value: number
  /** Omit for a read-only display. */
  onChange?: (value: number) => void
  /** Accessible name, e.g. the criterion label. */
  label: string
  /** id of the group, so a form label can point at it. */
  id?: string
  invalid?: boolean
}

// Five stars as a radio group, so it works with the keyboard and screen readers. Read-only when onChange is omitted.
export function StarRating({ value, onChange, label, id, invalid = false }: StarRatingProps) {
  const stars = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

  if (!onChange) {
    return (
      <span className="stars" role="img" aria-label={`${label}: ${value} out of ${MAX_RATING}`}>
        {stars.map((star) => (
          <span key={star} className={star <= value ? 'star on' : 'star'} aria-hidden="true">
            ★
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className="stars" role="radiogroup" aria-label={label} id={id} aria-invalid={invalid ? true : undefined}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          className={star <= value ? 'star on' : 'star'}
          // Roving tabindex: one tab stop for the group
          tabIndex={star === value || (value === 0 && star === 1) ? 0 : -1}
          onClick={() => onChange(star)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault()
              onChange(Math.min(MAX_RATING, value + 1))
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault()
              onChange(Math.max(1, value - 1))
            }
          }}
          data-testid={`${id ?? 'stars'}-${star}`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
