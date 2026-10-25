import { formatTimestamp, statusLabel, teamLabel } from '../format'
import type { CareQueueItem } from '../types'

interface CareQueueTableProps {
  rows: CareQueueItem[]
  /** Opens the update page for an encounter. */
  onOpen: (encounterId: string) => void
  emptyMessage?: string
}

// High-risk care queue: one row per encounter, with its workflow status and owner.
export function CareQueueTable({ rows, onOpen, emptyMessage = 'No high-risk encounters on this page.' }: CareQueueTableProps) {
  return (
    <div className="table-wrap">
      <table data-testid="queue-table">
        <thead>
          <tr>
            <th>Encounter ID</th>
            <th>Patient No</th>
            <th>Risk Score</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody data-testid="queue-body">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.encounter_id} data-testid={`row-queue-${row.encounter_id}`}>
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
                <td>{row.risk_score}</td>
                <td>{statusLabel(row.status)}</td>
                <td>{teamLabel(row.assigned_to)}</td>
                <td>{formatTimestamp(row.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
