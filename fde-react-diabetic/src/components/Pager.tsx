import { useId, useState, type FormEvent } from 'react'
import { PAGE_SIZE_OPTIONS } from '../constants'

interface PagerProps {
  page: number
  pageSize: number
  /** Rows on the current page. */
  rowCount: number
  /** Total rows across all pages, or null when the total is unknown. */
  total: number | null
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function Pager({ page, pageSize, rowCount, total, onPageChange, onPageSizeChange }: PagerProps) {
  const selectId = useId()
  const jumpId = useId()
  const jumpErrorId = useId()
  // null means "not edited": the box then shows the current page number
  const [jumpValue, setJumpValue] = useState<string | null>(null)
  const [jumpError, setJumpError] = useState('')
  const shownJumpValue = jumpValue ?? String(page)

  const offset = (page - 1) * pageSize
  const totalPages = total !== null ? Math.max(1, Math.ceil(total / pageSize)) : null
  // Without a total, assume there is a next page when this one is full
  const hasNext = totalPages !== null ? page < totalPages : rowCount === pageSize
  const from = rowCount > 0 ? offset + 1 : 0
  const to = offset + rowCount
  const info =
    total !== null
      ? `Showing ${from}–${to} of ${total.toLocaleString()} · Page ${page} of ${totalPages}`
      : `Showing ${from}–${to} · Page ${page}`

  const handleJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const target = Number(shownJumpValue)
    if (shownJumpValue.trim() === '' || !Number.isInteger(target)) {
      setJumpError('Enter a page number.')
      return
    }
    if (target < 1 || (totalPages !== null && target > totalPages)) {
      setJumpError(totalPages !== null ? `Enter a page from 1 to ${totalPages}.` : 'Enter a page number of 1 or more.')
      return
    }
    setJumpError('')
    setJumpValue(null)
    onPageChange(target)
  }

  return (
    <div className="pager" data-testid="pager">
      <div className="pager-controls">
        <label htmlFor={selectId}>Rows per page</label>
        <select
          id={selectId}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          data-testid="select-page-size"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} data-testid="btn-prev-page">
          Previous
        </button>
        <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)} data-testid="btn-next-page">
          Next
        </button>
        <form className="pager-jump" onSubmit={handleJump} noValidate>
          <label htmlFor={jumpId}>Go to page</label>
          <input
            id={jumpId}
            type="number"
            min={1}
            max={totalPages ?? undefined}
            step={1}
            placeholder={totalPages !== null ? `1–${totalPages}` : 'Page'}
            value={shownJumpValue}
            onChange={(event) => {
              setJumpValue(event.target.value)
              setJumpError('')
            }}
            aria-invalid={jumpError ? true : undefined}
            aria-describedby={jumpError ? jumpErrorId : undefined}
            data-testid="input-go-to-page"
          />
          <button type="submit" data-testid="btn-go-to-page">
            Go
          </button>
          {jumpError && (
            <span className="pager-error" id={jumpErrorId} role="alert" data-testid="error-go-to-page">
              {jumpError}
            </span>
          )}
        </form>
      </div>
      <span className="pager-info" data-testid="pager-info">
        {info}
      </span>
    </div>
  )
}
