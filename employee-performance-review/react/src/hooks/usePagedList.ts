import { useEffect, useState } from 'react'
import { describeError } from '../api/errors'
import type { RequestOptions } from '../api/client'
import type { Page } from '../types'

export interface PageParams {
  limit: number
  offset: number
}

interface PageResult<T> {
  /** The request this result answers. A result for an older request is treated as loading. */
  key: string
  rows: T[]
  total: number | null
  error: string
}

/**
 * Loads one page of a list while it is active. Use it for any server-paginated table.
 * A request still in flight is cancelled when the page, page size, reload count or `fetchPage` changes, or on unmount.
 *
 * `fetchPage` must be a stable reference (a module-level function, or useCallback keyed on the filters).
 * A new `fetchPage`, for example after the filters change, reloads the list; call `setPage(1)` alongside it.
 */
export function usePagedList<T>(
  active: boolean,
  fetchPage: (params: PageParams, options: RequestOptions) => Promise<Page<T>>,
  initialPageSize = 5,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<PageResult<T> | null>(null)
  const [fetchSeen, setFetchSeen] = useState(0)

  // Counts fetchPage changes so a result for the old filters is never shown as current
  const [lastFetch, setLastFetch] = useState(() => fetchPage)
  if (lastFetch !== fetchPage) {
    setLastFetch(() => fetchPage)
    setFetchSeen((count) => count + 1)
  }

  const requestKey = `${fetchSeen}:${page}:${pageSize}:${reloadCount}`

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()

    fetchPage({ limit: pageSize, offset: (page - 1) * pageSize }, { signal: controller.signal })
      .then(({ rows, total }) => {
        if (controller.signal.aborted) return
        // Past the end (for example after the filters changed): go back to the last page with rows
        if (rows.length === 0 && page > 1) {
          setPage(page - 1)
          return
        }
        setResult({ key: requestKey, rows, total, error: '' })
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          key: requestKey,
          rows: [],
          total: null,
          error: describeError(caught, 'Could not load the list. Please try again.'),
        })
      })

    return () => controller.abort()
  }, [active, page, pageSize, requestKey, fetchPage])

  const current = result?.key === requestKey ? result : null

  return {
    rows: current?.rows ?? [],
    total: current?.total ?? null,
    page,
    pageSize,
    loading: active && current === null,
    error: current?.error ?? '',
    setPage,
    changePageSize: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    reload: () => setReloadCount((count) => count + 1),
  }
}
