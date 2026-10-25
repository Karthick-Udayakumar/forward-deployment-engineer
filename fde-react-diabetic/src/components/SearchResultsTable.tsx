import { statusLabel, teamLabel } from '../format'
import type { CareQueueItem } from '../types'

interface SearchResultsTableProps {
  rows: CareQueueItem[]
  /** Opens the update page for an encounter. */
  onOpen: (encounterId: string) => void
}

// Results of a patient search. An empty list shows "No record found."
export function SearchResultsTable({ rows, onOpen }: SearchResultsTableProps) {
  return (
    <div className="table-wrap">
      <table data-testid="results-table">
        <thead>
          <tr>
            <th>Encounter ID</th>
            <th>Patient No</th>
            <th>Risk Level</th>
            <th>Risk Score</th>
            <th>Status</th>
            <th>Assigned To</th>
          </tr>
        </thead>
        <tbody data-testid="results-body">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty" data-testid="no-record">
                No record found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.encounter_id} data-testid={`row-search-${row.encounter_id}`}>
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
                <td>{row.risk_level}</td>
                <td>{row.risk_score}</td>
                <td>{statusLabel(row.status)}</td>
                <td>{teamLabel(row.assigned_to)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
