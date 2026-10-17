/**
 * Typed client for the Diabetes Readmission Intervention Queue API (FastAPI).
 *
 * Every endpoint in main.py has one exported function here. All functions
 * share one request pipeline that handles timeouts, caller cancellation,
 * HTTP errors, network errors and malformed JSON, and always rejects with an ApiError.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ApiClientConfig {
  /** Base URL of the FastAPI server, without a trailing slash. */
  baseUrl: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs: number;
}

const config: ApiClientConfig = {
  baseUrl: "http://127.0.0.1:8000",
  timeoutMs: 10_000,
};

/** Override the defaults once at application start-up. */
export function configureApiClient(overrides: Partial<ApiClientConfig>): void {
  if (overrides.baseUrl !== undefined) {
    config.baseUrl = overrides.baseUrl.replace(/\/+$/, "");
  }
  if (overrides.timeoutMs !== undefined) {
    if (!Number.isFinite(overrides.timeoutMs) || overrides.timeoutMs <= 0) {
      throw new RangeError("timeoutMs must be a positive finite number");
    }
    config.timeoutMs = overrides.timeoutMs;
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "HTTP_ERROR" // server responded with a non-2xx status
  | "NETWORK_ERROR" // server unreachable, DNS failure, connection reset
  | "TIMEOUT" // no response within timeoutMs
  | "ABORTED" // caller cancelled via AbortSignal
  | "INVALID_RESPONSE"; // 2xx response whose body is not valid JSON

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status code, or null when no response was received. */
  readonly status: number | null;
  /** FastAPI `detail` payload (string for 404, array for 422) or raw body text. */
  readonly detail: unknown;

  constructor(code: ApiErrorCode, message: string, status: number | null = null, detail: unknown = null, cause?: unknown) {
    super(message, { cause });
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

// ---------------------------------------------------------------------------
// Domain types (mirror models.py, schema.sql and the SQL in repository.py)
// ---------------------------------------------------------------------------

export const INTERVENTION_STATUSES = [
  "PENDING_REVIEW",
  "ASSIGNED",
  "CONTACTED",
  "FOLLOW_UP_SCHEDULED",
  "CLOSED",
] as const;

export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Encounter {
  encounter_id: string;
  patient_nbr: string;
  age: string | null;
  time_in_hospital: number | null;
  number_inpatient: number | null;
  number_emergency: number | null;
  number_outpatient: number | null;
  num_medications: number | null;
  num_lab_procedures: number | null;
  discharge_disposition_id: number | null;
  admission_type_id: number | null;
  readmitted: string | null;
  risk_score: number;
  risk_level: RiskLevel;
}

/** Row returned by the care-queue endpoints: encounter joined with its latest intervention. */
export interface CareQueueItem extends Encounter {
  status: InterventionStatus | null;
  assigned_to: string | null;
  notes: string | null;
  updated_at: string | null;
}

export interface Intervention {
  intervention_id: number;
  encounter_id: string;
  status: InterventionStatus;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterventionUpdate {
  status: InterventionStatus;
  /** Omitted fields are sent as null and overwrite the stored value. */
  assigned_to?: string | null;
  notes?: string | null;
}

export interface InterventionUpdateResponse {
  message: string;
  data: Intervention;
}

export interface OperationsSummary {
  total_encounters: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  pending_interventions: number;
  completed_interventions: number;
}

export interface ReadmissionAnalysis {
  high_risk_patients: number;
  high_risk_readmitted_under_30_days: number;
  /** Percentage, rounded to 2 decimal places. */
  high_risk_readmission_rate: number;
}

export interface ManagementDashboard {
  operations: OperationsSummary;
  clinical_validation: ReadmissionAnalysis;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface RequestOptions {
  /** Cancels the request when aborted. */
  signal?: AbortSignal;
  /** Overrides the configured timeout for this call only. */
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const MAX_PAGE_SIZE = 500;

function assertPagination({ limit, offset }: PaginationParams): { limit: number; offset: number } {
  const safeLimit = limit ?? 100;
  const safeOffset = offset ?? 0;
  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > MAX_PAGE_SIZE) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
  }
  if (!Number.isInteger(safeOffset) || safeOffset < 0) {
    throw new RangeError("offset must be a non-negative integer");
  }
  return { limit: safeLimit, offset: safeOffset };
}

function assertEncounterId(encounterId: string): void {
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw new TypeError("encounterId must be a non-empty string");
  }
}

function assertInterventionStatus(status: string): asserts status is InterventionStatus {
  if (!(INTERVENTION_STATUSES as readonly string[]).includes(status)) {
    throw new TypeError(`status must be one of: ${INTERVENTION_STATUSES.join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Request pipeline
// ---------------------------------------------------------------------------

interface RequestSpec {
  method: "GET" | "PATCH";
  path: string;
  query?: Record<string, string | number>;
  body?: unknown;
  options?: RequestOptions;
}

async function request<T>(spec: RequestSpec): Promise<T> {
  const url = new URL(config.baseUrl + spec.path);
  for (const [key, value] of Object.entries(spec.query ?? {})) {
    url.searchParams.set(key, String(value));
  }

  const timeoutMs = spec.options?.timeoutMs ?? config.timeoutMs;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const callerSignal = spec.options?.signal;
  const onCallerAbort = () => controller.abort();
  const cleanup = () => {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  };
  if (callerSignal?.aborted) {
    controller.abort();
  } else {
    callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (spec.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(spec.body);
  }

  let response: Response;
  try {
    response = await fetch(url, { method: spec.method, headers, body, signal: controller.signal });
  } catch (error) {
    cleanup();
    if (timedOut) {
      throw new ApiError("TIMEOUT", `Request to ${spec.path} timed out after ${timeoutMs} ms`, null, null, error);
    }
    if (callerSignal?.aborted) {
      throw new ApiError("ABORTED", `Request to ${spec.path} was aborted`, null, null, error);
    }
    throw new ApiError("NETWORK_ERROR", `Could not reach the API at ${config.baseUrl}`, null, null, error);
  }

  // The timer stays armed while the body streams in, so slow bodies also time out.
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    cleanup();
    if (timedOut) {
      throw new ApiError("TIMEOUT", `Reading response from ${spec.path} timed out`, response.status, null, error);
    }
    if (callerSignal?.aborted) {
      throw new ApiError("ABORTED", `Request to ${spec.path} was aborted`, response.status, null, error);
    }
    throw new ApiError("NETWORK_ERROR", `Connection lost while reading ${spec.path}`, response.status, null, error);
  }
  cleanup();

  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      if (response.ok) {
        throw new ApiError("INVALID_RESPONSE", `Invalid JSON from ${spec.path}`, response.status, text, error);
      }
      parsed = text; // Non-JSON error bodies (e.g. proxy HTML) are kept as raw text.
    }
  }

  if (!response.ok) {
    const detail = typeof parsed === "object" && parsed !== null && "detail" in parsed
      ? (parsed as { detail: unknown }).detail
      : parsed;
    const reason = typeof detail === "string" ? detail : `HTTP ${response.status}`;
    throw new ApiError("HTTP_ERROR", `${spec.method} ${spec.path} failed: ${reason}`, response.status, detail);
  }

  return parsed as T;
}

// ---------------------------------------------------------------------------
// Endpoints (one function per route in main.py)
// ---------------------------------------------------------------------------

/** GET /encounters : paginated list of all encounters. */
export async function listEncounters(params: PaginationParams = {}, options?: RequestOptions): Promise<Encounter[]> {
  const query = assertPagination(params);
  return request<Encounter[]>({ method: "GET", path: "/encounters", query, options });
}

/** GET /encounters/{encounter_id} : rejects with ApiError status 404 if the encounter does not exist. */
export async function getEncounterById(encounterId: string, options?: RequestOptions): Promise<Encounter> {
  assertEncounterId(encounterId);
  return request<Encounter>({
    method: "GET",
    path: `/encounters/${encodeURIComponent(encounterId)}`,
    options,
  });
}

/** GET /care-queue : MEDIUM and HIGH risk encounters, highest score first. */
export async function getCareQueue(params: PaginationParams = {}, options?: RequestOptions): Promise<CareQueueItem[]> {
  const query = assertPagination(params);
  return request<CareQueueItem[]>({ method: "GET", path: "/care-queue", query, options });
}

/** GET /care-queue/high : HIGH risk encounters only, highest score first. */
export async function getHighRiskCareQueue(params: PaginationParams = {}, options?: RequestOptions): Promise<CareQueueItem[]> {
  const query = assertPagination(params);
  return request<CareQueueItem[]>({ method: "GET", path: "/care-queue/high", query, options });
}

/**
 * PATCH /interventions/{encounter_id} : creates or updates the intervention for an encounter.
 * Rejects with ApiError status 404 if the encounter does not exist.
 */
export async function updateIntervention(
  encounterId: string,
  update: InterventionUpdate,
  options?: RequestOptions,
): Promise<InterventionUpdateResponse> {
  assertEncounterId(encounterId);
  assertInterventionStatus(update.status);
  return request<InterventionUpdateResponse>({
    method: "PATCH",
    path: `/interventions/${encodeURIComponent(encounterId)}`,
    body: {
      status: update.status,
      assigned_to: update.assigned_to ?? null,
      notes: update.notes ?? null,
    },
    options,
  });
}

/** GET /operations/summary : workload and queue counts. */
export async function getOperationsSummary(options?: RequestOptions): Promise<OperationsSummary> {
  return request<OperationsSummary>({ method: "GET", path: "/operations/summary", options });
}

/** GET /operations/readmission-analysis : HIGH-risk readmission rate against historical <30-day outcomes. */
export async function getReadmissionAnalysis(options?: RequestOptions): Promise<ReadmissionAnalysis> {
  return request<ReadmissionAnalysis>({ method: "GET", path: "/operations/readmission-analysis", options });
}

/** GET /management/dashboard : operations summary and clinical validation together. */
export async function getManagementDashboard(options?: RequestOptions): Promise<ManagementDashboard> {
  return request<ManagementDashboard>({ method: "GET", path: "/management/dashboard", options });
}
