import { useEffect, useState } from 'react'
import { listEmployees, listReviewPeriods } from '../api/client'
import type { Employee, ReviewPeriod } from '../types'

/**
 * Employees and review periods for dropdowns. Loads while `active` is true.
 * `openOnly` restricts the periods to those that accept new reviews (used by the submit form).
 */
export function useLookups(active: boolean, openOnly: boolean) {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [periods, setPeriods] = useState<ReviewPeriod[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    Promise.all([listEmployees(options), listReviewPeriods(openOnly ? 'Open' : undefined, options)])
      .then(([loadedEmployees, loadedPeriods]) => {
        setEmployees(loadedEmployees)
        setPeriods(loadedPeriods)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [active, openOnly])

  return { employees, periods, failed }
}
