import { useState } from 'react'
import { searchEncounters } from '../api/client'
import { describeError } from '../api/errors'
import type { SearchFormValues } from '../components/SearchForm'
import type { CareQueueItem } from '../types'

const SEARCH_LIMIT = 100

const EMPTY_VALUES: SearchFormValues = { patientNbr: '', riskLevel: '', riskScore: '' }

/** Patient search: the form values, the results, and the status line. Searches only when `search` is called. */
export function useEncounterSearch() {
  const [values, setValues] = useState<SearchFormValues>(EMPTY_VALUES)
  const [results, setResults] = useState<CareQueueItem[] | null>(null) // null = not searched yet
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('') // input problem, shown under the form
  const [error, setError] = useState('')

  const search = async (next: SearchFormValues) => {
    setValues(next)
    setBusy(true)
    setHint('')
    setError('')
    try {
      const rows = await searchEncounters({
        patientNbr: next.patientNbr.trim() || undefined,
        riskLevel: next.riskLevel || undefined,
        riskScore: next.riskScore === '' ? undefined : Number(next.riskScore),
        limit: SEARCH_LIMIT,
      })
      setResults(rows)
    } catch (caught) {
      // Input problems are caught before any request is sent
      if (caught instanceof TypeError || caught instanceof RangeError) {
        setHint(caught.message)
      } else {
        setResults([])
        setError(describeError(caught, 'Search failed. Please try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  const status = (() => {
    if (error) return error
    if (results === null) return ''
    if (results.length === 0) return 'No record found.'
    if (results.length === SEARCH_LIMIT) {
      return `Showing the first ${SEARCH_LIMIT} records. Narrow the search to see more.`
    }
    return `${results.length} record(s) found.`
  })()

  return { values, results, busy, hint, error, status, search }
}
