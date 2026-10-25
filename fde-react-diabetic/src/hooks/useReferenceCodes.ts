import { useEffect, useState } from 'react'
import { getReferenceCodes } from '../api/client'
import type { ReferenceCodes } from '../types'

/** Dropdown options for admission and discharge. Loads while `active` is true. */
export function useReferenceCodes(active: boolean) {
  const [codes, setCodes] = useState<ReferenceCodes | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    getReferenceCodes({ signal: controller.signal })
      .then((loaded) => setCodes(loaded))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [active])

  return { codes, failed }
}
