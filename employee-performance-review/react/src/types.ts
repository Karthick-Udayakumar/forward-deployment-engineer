// Shared types for the Employee Performance Review UI.
// These mirror the FastAPI responses in ../api (models.py, repository.py) and the client in api/client.ts,
// so keep them in sync when the API changes.

export type PeriodStatus = 'Open' | 'Closed'

export interface Employee {
  id: number
  /** Employee code, e.g. EMP101. */
  employee_id: string
  name: string
  department: string | null
  email: string | null
  status: string | null
}

export interface ReviewPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  status: PeriodStatus
}

/** One row of performance_reviews, as returned by POST /reviews. */
export interface Review {
  id: number
  employee_id: number
  period_id: number
  quality_rating: number
  delivery_rating: number
  teamwork_rating: number
  /** Calculated by the server: (quality + delivery + teamwork) / 3. */
  average_rating: number
  comments: string
  created_at: string
}

/** Review joined with employee and period names. Returned by GET /reviews and GET /reviews/{id}. */
export interface ReviewListItem extends Review {
  employee_code: string
  employee_name: string
  period_name: string
}

/** Body for POST /reviews. The server sets id, average_rating and created_at. */
export interface ReviewCreate {
  employee_id: number
  period_id: number
  quality_rating: number
  delivery_rating: number
  teamwork_rating: number
  comments: string
}

export interface PaginationParams {
  /** 1 to 500. */
  limit?: number
  offset?: number
}

/** Query for GET /reviews. Filters left out are ignored. */
export interface ReviewFilters {
  periodId?: number
  employeeId?: number
}

/** One page of a list, with the total across all pages (null if the server did not say). */
export interface Page<T> {
  rows: T[]
  total: number | null
}

/** Error body shape from FastAPI: `detail` is a string for 404/409 and an array for 422. */
export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}
