import { formatAverage } from '../format'
import type { ReviewListItem } from '../types'

interface ReviewsTableProps {
  rows: ReviewListItem[]
  /** Opens the details screen for a review. */
  onOpen: (reviewId: number) => void
  emptyMessage?: string
}

// One row per review. A submitted review is complete, so Status is always "Completed".
export function ReviewsTable({ rows, onOpen, emptyMessage = 'No reviews found.' }: ReviewsTableProps) {
  return (
    <div className="table-wrap">
      <table data-testid="reviews-table">
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Employee Name</th>
            <th>Period</th>
            <th>Ratings</th>
            <th>Average</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} data-testid={`row-review-${row.id}`}>
                <td>{row.employee_code}</td>
                <td>{row.employee_name}</td>
                <td>{row.period_name}</td>
                <td>{`${row.quality_rating}, ${row.delivery_rating}, ${row.teamwork_rating}`}</td>
                <td>{formatAverage(row.average_rating)}</td>
                <td>
                  <span className="badge success">Completed</span>
                </td>
                <td>
                  <a
                    className="review-link"
                    href="#details"
                    onClick={(event) => {
                      event.preventDefault()
                      onOpen(row.id)
                    }}
                  >
                    View
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
