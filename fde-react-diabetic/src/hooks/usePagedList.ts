import { useEffect, useState } from 'react'
import { describeError } from '../api/errors'
import type { RequestOptions } from '../api/client'

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
 * A request still in flight is cancelled when the page, page size or reload count changes, or on unmount.
 *
 * `fetchRows` and `fetchTotal` must be stable references (module-level functions), otherwise the list reloads on every render.
 */
export function usePagedList<T>(
  active: boolean,
  fetchRows: (params: PageParams, options: RequestOptions) => Promise<T[]>,
  fetchTotal: (options: RequestOptions) => Promise<number>,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState<PageResult<T> | null>(null)

  const requestKey = `${page}:${pageSize}:${reloadCount}`

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const options = { signal: controller.signal }

    Promise.all([
      fetchRows({ limit: pageSize, offset: (page - 1) * pageSize }, options),
      fetchTotal(options).catch(() => null), // the total is optional; paging still works without it
    ])
      .then(([nextRows, nextTotal]) => {
        if (controller.signal.aborted) return
        // Past the end (for example after rows were removed): go back to the last page with rows
        if (nextRows.length === 0 && page > 1) {
          setPage(page - 1)
          return
        }
        setResult({ key: requestKey, rows: nextRows, total: nextTotal, error: '' })
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
  }, [active, page, pageSize, requestKey, fetchRows, fetchTotal])

  const current = result?.key === requestKey ? result : null

  return {
    rows: result?.rows ?? [],
    total: result?.total ?? null,
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
