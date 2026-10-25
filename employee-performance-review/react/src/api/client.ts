/**
 * Typed client for the Employee Performance Review API (FastAPI, base path /api).
 *
 * Every endpoint in ../../api/main.py has one exported function here. All functions share one request
 * pipeline that handles timeouts, caller cancellation, HTTP errors, network errors and malformed JSON,
 * and always rejects with an ApiError. The data shapes are defined in ../types.ts.
 */

import { MAX_RATING, MIN_RATING } from '../constants'
import type {
  Employee,
  Page,
  PaginationParams,
  Review,
  ReviewCreate,
  ReviewFilters,
  ReviewListItem,
  ReviewPeriod,
  PeriodStatus,
} from '../types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ApiClientConfig {
  /** Base URL of the FastAPI server, without a trailing slash. */
  baseUrl: string
  /** Per-request timeout in milliseconds. */
  timeoutMs: number
}

const config: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  timeoutMs: 10_000,
}

/** Override the defaults once at application start-up. */
export function configureApiClient(overrides: Partial<ApiClientConfig>): void {
  if (overrides.baseUrl !== undefined) config.baseUrl = overrides.baseUrl.replace(/\/+$/, '')
  if (overrides.timeoutMs !== undefined) {
    if (!Number.isFinite(overrides.timeoutMs) || overrides.timeoutMs <= 0) {
      throw new RangeError('timeoutMs must be a positive finite number')
    }
    config.timeoutMs = overrides.timeoutMs
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | 'HTTP_ERROR' // server responded with a non-2xx status
  | 'NETWORK_ERROR' // server unreachable, DNS failure, connection reset
  | 'TIMEOUT' // no response within timeoutMs
  | 'ABORTED' // caller cancelled via AbortSignal
  | 'INVALID_RESPONSE' // 2xx response whose body is not valid JSON

export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP status code, or null when no response was received. */
  readonly status: number | null
  /** FastAPI `detail` payload (string for 404/409, array for 422) or raw body text. */
  readonly detail: unknown

  constructor(code: ApiErrorCode, message: string, status: number | null = null, detail: unknown = null, cause?: unknown) {
    super(message, { cause })
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const MAX_PAGE_SIZE = 500
const RATING_FIELDS = ['quality_rating', 'delivery_rating', 'teamwork_rating'] as const

export interface RequestOptions {
  /** Cancels the request when aborted. */
  signal?: AbortSignal
  /** Overrides the configured timeout for this call only. */
  timeoutMs?: number
}

function assertPagination({ limit, offset }: PaginationParams): { limit: number; offset: number } {
  const safeLimit = limit ?? 50
  const safeOffset = offset ?? 0
  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > MAX_PAGE_SIZE) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`)
  }
  if (!Number.isInteger(safeOffset) || safeOffset < 0) {
    throw new RangeError('offset must be a non-negative integer')
  }
  return { limit: safeLimit, offset: safeOffset }
}

function assertId(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive whole number`)
  }
}

// ---------------------------------------------------------------------------
// Request pipeline
// ---------------------------------------------------------------------------

interface RequestSpec {
  method: 'GET' | 'POST' | 'PATCH'
  path: string
  query?: Record<string, string | number>
  body?: unknown
  options?: RequestOptions
}

async function request<T>(spec: RequestSpec): Promise<T> {
  return (await requestFull<T>(spec)).data
}

/** Like request, but also returns the X-Total-Count header (null when absent). */
async function requestFull<T>(spec: RequestSpec): Promise<{ data: T; total: number | null }> {
  const url = new URL(config.baseUrl + spec.path)
  for (const [key, value] of Object.entries(spec.query ?? {})) {
    url.searchParams.set(key, String(value))
  }

  const timeoutMs = spec.options?.timeoutMs ?? config.timeoutMs
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const callerSignal = spec.options?.signal
  const onCallerAbort = () => controller.abort()
  const cleanup = () => {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', onCallerAbort)
  }
  if (callerSignal?.aborted) {
    controller.abort()
  } else {
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true })
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: string | undefined
  if (spec.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(spec.body)
  }

  let response: Response
  try {
    response = await fetch(url, { method: spec.method, headers, body, signal: controller.signal })
  } catch (error) {
    cleanup()
    if (timedOut) throw new ApiError('TIMEOUT', `Request to ${spec.path} timed out after ${timeoutMs} ms`, null, null, error)
    if (callerSignal?.aborted) throw new ApiError('ABORTED', `Request to ${spec.path} was aborted`, null, null, error)
    throw new ApiError('NETWORK_ERROR', `Could not reach the API at ${config.baseUrl}`, null, null, error)
  }

  // The timer stays armed while the body streams in, so slow bodies also time out.
  let text: string
  try {
    text = await response.text()
  } catch (error) {
    cleanup()
    if (timedOut) throw new ApiError('TIMEOUT', `Reading response from ${spec.path} timed out`, response.status, null, error)
    if (callerSignal?.aborted) throw new ApiError('ABORTED', `Request to ${spec.path} was aborted`, response.status, null, error)
    throw new ApiError('NETWORK_ERROR', `Connection lost while reading ${spec.path}`, response.status, null, error)
  }
  cleanup()

  let parsed: unknown = null
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      if (response.ok) throw new ApiError('INVALID_RESPONSE', `Invalid JSON from ${spec.path}`, response.status, text, error)
      parsed = text // Non-JSON error bodies (e.g. proxy HTML) are kept as raw text.
    }
  }

  if (!response.ok) {
    const detail =
      typeof parsed === 'object' && parsed !== null && 'detail' in parsed ? (parsed as { detail: unknown }).detail : parsed
    const reason = typeof detail === 'string' ? detail : `HTTP ${response.status}`
    throw new ApiError('HTTP_ERROR', `${spec.method} ${spec.path} failed: ${reason}`, response.status, detail)
  }

  const header = response.headers.get('X-Total-Count')
  const total = header !== null && Number.isInteger(Number(header)) ? Number(header) : null
  return { data: parsed as T, total }
}

// ---------------------------------------------------------------------------
// Endpoints (one function per route in main.py)
// ---------------------------------------------------------------------------

/** GET /employees : employees for dropdowns. */
export async function listEmployees(options?: RequestOptions): Promise<Employee[]> {
  return request<Employee[]>({ method: 'GET', path: '/employees', options })
}

/** GET /review-periods : all periods, newest first. Pass status 'Open' for the periods that accept new reviews. */
export async function listReviewPeriods(status?: PeriodStatus, options?: RequestOptions): Promise<ReviewPeriod[]> {
  const query: Record<string, string> = {}
  if (status !== undefined) query.status = status
  return request<ReviewPeriod[]>({ method: 'GET', path: '/review-periods', query, options })
}

/** GET /reviews : one page of reviews matching every filter given (AND), plus the total across all pages. */
export async function listReviews(
  params: PaginationParams & ReviewFilters = {},
  options?: RequestOptions,
): Promise<Page<ReviewListItem>> {
  const query: Record<string, string | number> = { ...assertPagination(params) }
  if (params.periodId !== undefined) {
    assertId('periodId', params.periodId)
    query.period_id = params.periodId
  }
  if (params.employeeId !== undefined) {
    assertId('employeeId', params.employeeId)
    query.employee_id = params.employeeId
  }
  const { data, total } = await requestFull<ReviewListItem[]>({ method: 'GET', path: '/reviews', query, options })
  return { rows: data, total }
}

/** GET /reviews/{id} : rejects with ApiError status 404 if the review does not exist. */
export async function getReview(reviewId: number, options?: RequestOptions): Promise<ReviewListItem> {
  assertId('reviewId', reviewId)
  return request<ReviewListItem>({ method: 'GET', path: `/reviews/${reviewId}`, options })
}

/**
 * POST /reviews : returns the saved row, including the calculated average_rating.
 * Rejects with status 404 (unknown employee or period), 409 (closed period, or the employee already has a
 * review for the period) or 422 (a value the server finds invalid).
 */
export async function createReview(input: ReviewCreate, options?: RequestOptions): Promise<Review> {
  assertId('employee_id', input.employee_id)
  assertId('period_id', input.period_id)
  for (const field of RATING_FIELDS) {
    const value = input[field]
    if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
      throw new RangeError(`${field} must be a whole number from ${MIN_RATING} to ${MAX_RATING}`)
    }
  }
  if (typeof input.comments !== 'string' || input.comments.trim() === '') {
    throw new TypeError('comments must not be empty')
  }
  return request<Review>({ method: 'POST', path: '/reviews', body: { ...input, comments: input.comments.trim() }, options })
}
