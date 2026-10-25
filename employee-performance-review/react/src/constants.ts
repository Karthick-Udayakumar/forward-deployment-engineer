export interface Option<T extends string | number = string> {
  value: T
  label: string
}

/** The three rating criteria. `key` is the field name in the API. */
export const CRITERIA = [
  { key: 'quality_rating', label: 'Quality of Work' },
  { key: 'delivery_rating', label: 'Delivery & Ownership' },
  { key: 'teamwork_rating', label: 'Teamwork & Collaboration' },
] as const

export type CriterionKey = (typeof CRITERIA)[number]['key']

export const MIN_RATING = 1
export const MAX_RATING = 5
export const MAX_COMMENT_LENGTH = 2000

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]

// Pages of the app. The details page is reached from a row in the list, not from the header.
export type AppPage = 'reviews' | 'submit' | 'details'

/** Fields the API can report in a 422 response. They match the keys of the review form. */
export const REVIEW_FIELDS = [
  'employee_id',
  'period_id',
  'quality_rating',
  'delivery_rating',
  'teamwork_rating',
  'comments',
] as const

export type ReviewFieldName = (typeof REVIEW_FIELDS)[number]

/** Message per field name, e.g. from a 422 response. */
export type ReviewFieldErrors = Partial<Record<ReviewFieldName, string>>
