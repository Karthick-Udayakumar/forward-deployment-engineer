import { useCallback, useState } from 'react'
import { listReviews, type RequestOptions } from '../api/client'
import type { ReviewFilters } from '../types'
import { usePagedList, type PageParams } from './usePagedList'

/** Reviews for the list screen: one page at a time, narrowed by the filters most recently applied with `search`. */
export function useReviewList(active: boolean) {
  const [filters, setFilters] = useState<ReviewFilters>({})

  // Changes only when the filters do, which is what makes usePagedList reload
  const fetchPage = useCallback(
    (params: PageParams, options: RequestOptions) => listReviews({ ...params, ...filters }, options),
    [filters],
  )
  const list = usePagedList(active, fetchPage)

  const search = (next: ReviewFilters) => {
    setFilters(next)
    list.setPage(1)
  }

  return { ...list, filters, search }
}
