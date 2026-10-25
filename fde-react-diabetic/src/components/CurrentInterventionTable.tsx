import { formatTimestamp, outcomeLabel, statusLabel, teamLabel } from '../format'
import type { InterventionDetail } from '../types'

interface CurrentInterventionTableProps {
  item: InterventionDetail
}

// The saved state of one encounter's intervention, as last stored on the server.
export function CurrentInterventionTable({ item }: CurrentInterventionTableProps) {
  return (
    <div className="table-wrap">
      <table data-testid="intervention-table">
        <thead>
          <tr>
            <th>Encounter ID</th>
            <th>Patient No</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Notes</th>
            <th>Last Updated</th>
            <th>30-Day Outcome</th>
          </tr>
        </thead>
        <tbody data-testid="intervention-body">
          <tr data-testid="row-intervention">
            <td>
              <strong>{item.encounter_id}</strong>
            </td>
            <td>{item.patient_nbr}</td>
            <td>{statusLabel(item.status)}</td>
            <td>{teamLabel(item.assigned_to)}</td>
            <td className="wrap">{item.notes ?? ''}</td>
            <td>{formatTimestamp(item.updated_at)}</td>
            <td>{outcomeLabel(item.readmitted)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
