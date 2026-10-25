import { CRITERIA } from '../constants'
import { formatAverage, formatTimestamp } from '../format'
import type { ReviewListItem } from '../types'
import { StarRating } from './StarRating'

interface ReviewDetailsProps {
  review: ReviewListItem
}

export function ReviewDetails({ review }: ReviewDetailsProps) {
  return (
    <div data-testid="review-details">
      <dl className="summary">
        <div>
          <dt>Employee</dt>
          <dd>{`${review.employee_code} - ${review.employee_name}`}</dd>
        </div>
        <div>
          <dt>Review Period</dt>
          <dd>{review.period_name}</dd>
        </div>
        <div>
          <dt>Overall Rating</dt>
          <dd className="overall" data-testid="overall-rating">
            {formatAverage(review.average_rating)} / 5
          </dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatTimestamp(review.created_at)}</dd>
        </div>
      </dl>

      <h3>Performance Criteria</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Criteria</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map(({ key, label }) => (
              <tr key={key}>
                <td>{label}</td>
                <td>
                  <StarRating label={label} value={review[key]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Manager Comments</h3>
      <p className="comments">{review.comments}</p>
    </div>
  )
}
