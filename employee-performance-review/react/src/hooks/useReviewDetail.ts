import { useEffect, useState } from 'react'
import { getReview, isApiError } from '../api/client'
import type { ReviewListItem } from '../types'

/** One review for the details screen. Loads while `active`. */
export function useReviewDetail(reviewId: number | null, active: boolean) {
  const [loaded, setLoaded] = useState<ReviewListItem | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!active || reviewId === null) return
    const controller = new AbortController()
    getReview(reviewId, { signal: controller.signal })
      .then((item) => {
        setLoaded(item)
        setLoadError('')
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(
          isApiError(caught) && caught.status === 404
            ? `Review ${reviewId} was not found.`
            : 'Could not load this review. Please try again.',
        )
      })
    return () => controller.abort()
  }, [active, reviewId])

  // Ignore a record left over from a previously opened review
  const detail = loaded !== null && loaded.id === reviewId ? loaded : null

  /** Clears the loaded record, before opening a different review. */
  const reset = () => {
    setLoaded(null)
    setLoadError('')
  }

  return { detail, loadError, reset }
}
