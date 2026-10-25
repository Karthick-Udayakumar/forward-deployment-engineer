import { useState } from 'react'
import type { Encounter, RiskLevel } from '../types'
import { SortableHeader } from './SortableHeader'

type SortKey = 'encounter_id' | 'patient_nbr' | 'age' | 'time_in_hospital' | 'num_medications' | 'risk_level'

const RISK_RANK: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }

function toNumber(value: string | null): number | null {
  if (value === null) return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

// The value each column sorts by. null means "no value", which always sorts last.
const SORT_VALUE: Record<SortKey, (row: Encounter) => number | null> = {
  encounter_id: (row) => toNumber(row.encounter_id),
  patient_nbr: (row) => toNumber(row.patient_nbr),
  // Age buckets like "[10-20)" sort by their lower bound
  age: (row) => {
    const digits = row.age?.match(/\d+/)?.[0]
    return digits ? Number(digits) : null
  },
  time_in_hospital: (row) => row.time_in_hospital,
  num_medications: (row) => row.num_medications,
  risk_level: (row) => RISK_RANK[row.risk_level],
}

function compareRows(a: Encounter, b: Encounter, key: SortKey, direction: 'asc' | 'desc'): number {
  const x = SORT_VALUE[key](a)
  const y = SORT_VALUE[key](b)
  if (x === null && y === null) return 0
  if (x === null) return 1
  if (y === null) return -1
  return direction === 'asc' ? x - y : y - x
}

interface EncountersTableProps {
  rows: Encounter[]
  /** Opens the update page for an encounter. */
  onOpen: (encounterId: string) => void
}

// Recent encounters. Sorting covers the rows passed in, which is the current page only.
export function EncountersTable({ rows, onOpen }: EncountersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')

  // Clicking the sorted column again reverses the order. Clicking another column starts ascending.
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  const sortedRows = sortKey ? [...rows].sort((a, b) => compareRows(a, b, sortKey, direction)) : rows

  return (
    <div className="table-wrap" data-testid="table-wrap">
      <table data-testid="encounters-table">
        <thead>
          <tr>
            <SortableHeader label="Encounter ID" sortKey="encounter_id" activeKey={sortKey} direction={direction} onSort={handleSort} />
            <SortableHeader label="Patient ID" sortKey="patient_nbr" activeKey={sortKey} direction={direction} onSort={handleSort} />
            <SortableHeader label="Age Group" sortKey="age" activeKey={sortKey} direction={direction} onSort={handleSort} />
            <SortableHeader label="Hospital Days" sortKey="time_in_hospital" activeKey={sortKey} direction={direction} onSort={handleSort} />
            <SortableHeader label="Medications (count)" sortKey="num_medications" activeKey={sortKey} direction={direction} onSort={handleSort} />
            <SortableHeader label="Risk Level" sortKey="risk_level" activeKey={sortKey} direction={direction} onSort={handleSort} />
          </tr>
        </thead>
        <tbody data-testid="table-body">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty" data-testid="no-records">
                No encounters found in the database.
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr key={row.encounter_id} data-testid={`row-encounter-${row.encounter_id}`}>
                <td>
                  <a
                    className="encounter-link"
                    href="#update"
                    onClick={(event) => {
                      event.preventDefault()
                      onOpen(row.encounter_id)
                    }}
                  >
                    {row.encounter_id}
                  </a>
                </td>
                <td>{row.patient_nbr}</td>
                <td>{row.age ?? 'N/A'}</td>
                <td>{row.time_in_hospital ?? 'N/A'}</td>
                <td>{row.num_medications ?? 'N/A'}</td>
                <td>{row.risk_level}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
