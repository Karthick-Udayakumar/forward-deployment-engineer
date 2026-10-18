/**
 * Typed client for the Diabetes Readmission Intervention Queue API (FastAPI).
 *
 * Every endpoint in main.py has one exported function here. All functions
 * share one request pipeline that handles timeouts, caller cancellation,
 * HTTP errors, network errors and malformed JSON, and always rejects with an ApiError.
 */
const config = {
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 10_000,
};
/** Override the defaults once at application start-up. */
export function configureApiClient(overrides) {
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
export class ApiError extends Error {
    code;
    /** HTTP status code, or null when no response was received. */
    status;
    /** FastAPI `detail` payload (string for 404, array for 422) or raw body text. */
    detail;
    constructor(code, message, status = null, detail = null, cause) {
        super(message, { cause });
        this.name = "ApiError";
        this.code = code;
        this.status = status;
        this.detail = detail;
    }
}
export function isApiError(error) {
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
];
// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const MAX_PAGE_SIZE = 500;
function assertPagination({ limit, offset }) {
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
function assertEncounterId(encounterId) {
    if (typeof encounterId !== "string" || encounterId.trim() === "") {
        throw new TypeError("encounterId must be a non-empty string");
    }
}
function assertInterventionStatus(status) {
    if (!INTERVENTION_STATUSES.includes(status)) {
        throw new TypeError(`status must be one of: ${INTERVENTION_STATUSES.join(", ")}`);
    }
}
async function request(spec) {
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
    }
    else {
        callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
    }
    const headers = { Accept: "application/json" };
    let body;
    if (spec.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(spec.body);
    }
    let response;
    try {
        response = await fetch(url, { method: spec.method, headers, body, signal: controller.signal });
    }
    catch (error) {
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
    let text;
    try {
        text = await response.text();
    }
    catch (error) {
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
    let parsed = null;
    if (text.length > 0) {
        try {
            parsed = JSON.parse(text);
        }
        catch (error) {
            if (response.ok) {
                throw new ApiError("INVALID_RESPONSE", `Invalid JSON from ${spec.path}`, response.status, text, error);
            }
            parsed = text; // Non-JSON error bodies (e.g. proxy HTML) are kept as raw text.
        }
    }
    if (!response.ok) {
        const detail = typeof parsed === "object" && parsed !== null && "detail" in parsed
            ? parsed.detail
            : parsed;
        const reason = typeof detail === "string" ? detail : `HTTP ${response.status}`;
        throw new ApiError("HTTP_ERROR", `${spec.method} ${spec.path} failed: ${reason}`, response.status, detail);
    }
    return parsed;
}
// ---------------------------------------------------------------------------
// Endpoints (one function per route in main.py)
// ---------------------------------------------------------------------------
/** GET /encounters : paginated list of all encounters. */
export async function listEncounters(params = {}, options) {
    const query = assertPagination(params);
    return request({ method: "GET", path: "/encounters", query, options });
}
/** GET /encounters/{encounter_id} : rejects with ApiError status 404 if the encounter does not exist. */
export async function getEncounterById(encounterId, options) {
    assertEncounterId(encounterId);
    return request({
        method: "GET",
        path: `/encounters/${encodeURIComponent(encounterId)}`,
        options,
    });
}
/** GET /care-queue : MEDIUM and HIGH risk encounters, highest score first. */
export async function getCareQueue(params = {}, options) {
    const query = assertPagination(params);
    return request({ method: "GET", path: "/care-queue", query, options });
}
/** GET /care-queue/high : HIGH risk encounters only, highest score first. */
export async function getHighRiskCareQueue(params = {}, options) {
    const query = assertPagination(params);
    return request({ method: "GET", path: "/care-queue/high", query, options });
}
/**
 * PATCH /interventions/{encounter_id} : creates or updates the intervention for an encounter.
 * Rejects with ApiError status 404 if the encounter does not exist.
 */
export async function updateIntervention(encounterId, update, options) {
    assertEncounterId(encounterId);
    assertInterventionStatus(update.status);
    return request({
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
/** GET /interventions/{encounter_id} : the encounter's current intervention. Rejects with status 404 if the encounter does not exist. */
export async function getIntervention(encounterId, options) {
    assertEncounterId(encounterId);
    return request({
        method: "GET",
        path: `/interventions/${encodeURIComponent(encounterId)}`,
        options,
    });
}
/**
 * POST /encounters : creates an encounter and returns the saved row, including the generated encounter_id
 * and the calculated risk. Rejects with status 422 if the server finds a value invalid.
 */
export async function createEncounter(input, options) {
    if (typeof input.patient_nbr !== "string" || input.patient_nbr.trim() === "") {
        throw new TypeError("patient_nbr must be a non-empty string");
    }
    const counts = [
        ["time_in_hospital", input.time_in_hospital],
        ["number_inpatient", input.number_inpatient],
        ["number_emergency", input.number_emergency],
        ["number_outpatient", input.number_outpatient],
        ["num_medications", input.num_medications],
    ];
    for (const [name, value] of counts) {
        if (!Number.isInteger(value) || value < 0) {
            throw new RangeError(`${name} must be a whole number of zero or more`);
        }
    }
    return request({
        method: "POST",
        path: "/encounters",
        body: input,
        options,
    });
}
/**
 * PATCH /encounters/{encounter_id} : records the 30-day outcome. Does not change the risk score.
 * Rejects with status 409 if the value is already set and overwrite is not true.
 */
export async function updateReadmission(encounterId, input, options) {
    assertEncounterId(encounterId);
    return request({
        method: "PATCH",
        path: `/encounters/${encodeURIComponent(encounterId)}`,
        body: { readmitted: input.readmitted, overwrite: input.overwrite ?? false },
        options,
    });
}
/** GET /reference/codes : code lists for the admission and discharge dropdowns. */
export async function getReferenceCodes(options) {
    return request({ method: "GET", path: "/reference/codes", options });
}
/** GET /operations/summary : workload and queue counts. */
export async function getOperationsSummary(options) {
    return request({ method: "GET", path: "/operations/summary", options });
}
/** GET /operations/readmission-analysis : HIGH-risk readmission rate against historical <30-day outcomes. */
export async function getReadmissionAnalysis(options) {
    return request({ method: "GET", path: "/operations/readmission-analysis", options });
}
/** GET /management/dashboard : operations summary and clinical validation together. */
export async function getManagementDashboard(options) {
    return request({ method: "GET", path: "/management/dashboard", options });
}
// ---------------------------------------------------------------------------
// Patient search
// ---------------------------------------------------------------------------
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];
const MAX_RISK_SCORE = 8; // the risk rule in service.py adds up to 8 points
/**
 * GET /encounters/search : encounters matching every filter given (AND). Filters left out are ignored.
 * Returns an empty array when nothing matches, so the UI can show "No record found".
 * Rejects before sending a request when no filter is given or a value is out of range.
 */
export async function searchEncounters(params, options) {
    const { patientNbr, riskLevel, riskScore } = params;
    if (patientNbr === undefined && riskLevel === undefined && riskScore === undefined) {
        throw new TypeError("Provide at least one of patientNbr, riskLevel or riskScore");
    }
    if (patientNbr !== undefined && patientNbr.trim() === "") {
        throw new TypeError("patientNbr must not be empty");
    }
    if (riskLevel !== undefined && !RISK_LEVELS.includes(riskLevel)) {
        throw new TypeError(`riskLevel must be one of: ${RISK_LEVELS.join(", ")}`);
    }
    if (riskScore !== undefined && (!Number.isInteger(riskScore) || riskScore < 0 || riskScore > MAX_RISK_SCORE)) {
        throw new RangeError(`riskScore must be an integer between 0 and ${MAX_RISK_SCORE}`);
    }
    const { limit, offset } = assertPagination(params);
    const query = { limit, offset };
    if (patientNbr !== undefined)
        query.patient_nbr = patientNbr;
    if (riskLevel !== undefined)
        query.risk_level = riskLevel;
    if (riskScore !== undefined)
        query.risk_score = riskScore;
    return request({ method: "GET", path: "/encounters/search", query, options });
}
