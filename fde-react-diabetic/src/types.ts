// Shared types for the Diabetes Readmission Intervention Queue UI.
// These mirror the FastAPI responses in healthcare-readmission-ui-api (models.py, repository.py)
// and the typed client in client.ts, so keep them in sync when the API changes.

// ---------------------------------------------------------------------------
// Enums and literal unions
// ---------------------------------------------------------------------------

export const INTERVENTION_STATUSES = [
  'PENDING_REVIEW',
  'ASSIGNED',
  'CONTACTED',
  'FOLLOW_UP_SCHEDULED',
  'CLOSED',
] as const

export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number]

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/** 30-day readmission outcome. NO = not readmitted, <30 = within 30 days, >30 = after 30 days. */
export type ReadmissionValue = 'NO' | '<30' | '>30'

/** Age brackets used in diabetic_data.csv. */
export type AgeBracket =
  | '[0-10)'
  | '[10-20)'
  | '[20-30)'
  | '[30-40)'
  | '[40-50)'
  | '[50-60)'
  | '[60-70)'
  | '[70-80)'
  | '[80-90)'
  | '[90-100)'

// ---------------------------------------------------------------------------
// Encounters
// ---------------------------------------------------------------------------

/** One row of patient_encounters, as returned by GET /encounters and GET /encounters/{id}. */
export interface Encounter {
  encounter_id: string
  patient_nbr: string
  age: string | null
  time_in_hospital: number | null
  number_inpatient: number | null
  number_emergency: number | null
  number_outpatient: number | null
  num_medications: number | null
  num_lab_procedures: number | null
  discharge_disposition_id: number | null
  admission_type_id: number | null
  readmitted: ReadmissionValue | null
  risk_score: number
  risk_level: RiskLevel
}

/** Body for POST /encounters. The server sets encounter_id, risk_score and risk_level. */
export interface EncounterCreate {
  patient_nbr: string
  time_in_hospital: number
  number_inpatient: number
  number_emergency: number
  number_outpatient: number
  num_medications: number
  age?: AgeBracket | null
  num_lab_procedures?: number | null
  admission_type_id?: number | null
  discharge_disposition_id?: number | null
}

/** Body for PATCH /encounters/{encounter_id}. Setting an already-set value needs overwrite: true. */
export interface ReadmissionUpdate {
  readmitted: ReadmissionValue
  overwrite?: boolean
}

/**
 * Encounter joined with its latest intervention.
 * Returned by GET /care-queue, GET /care-queue/high and GET /encounters/search.
 */
export interface CareQueueItem extends Encounter {
  status: InterventionStatus | null
  assigned_to: string | null
  notes: string | null
  updated_at: string | null
}

// ---------------------------------------------------------------------------
// Interventions (care-management workflow)
// ---------------------------------------------------------------------------

/** One row of care_interventions. */
export interface Intervention {
  intervention_id: number
  encounter_id: string
  status: InterventionStatus
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Body for PATCH /interventions/{encounter_id}. Omitted optional fields are stored as null. */
export interface InterventionUpdate {
  status: InterventionStatus
  assigned_to?: string | null
  notes?: string | null
}

/** Response from PATCH /interventions/{encounter_id}. */
export interface InterventionUpdateResponse {
  message: string
  data: Intervention
}

/** Response from GET /interventions/{encounter_id}. */
export interface InterventionDetail {
  encounter_id: string
  patient_nbr: string
  /** Null until the follow-up outcome is recorded. */
  readmitted: ReadmissionValue | null
  /** Null until the first update creates the intervention. */
  status: InterventionStatus | null
  assigned_to: string | null
  notes: string | null
  updated_at: string | null
}

// ---------------------------------------------------------------------------
// Operations and management
// ---------------------------------------------------------------------------

/** Response from GET /operations/summary. */
export interface OperationsSummary {
  total_encounters: number
  high_risk: number
  medium_risk: number
  low_risk: number
  pending_interventions: number
  completed_interventions: number
}

/** Response from GET /operations/readmission-analysis. */
export interface ReadmissionAnalysis {
  high_risk_patients: number
  high_risk_readmitted_under_30_days: number
  /** Percentage, rounded to 2 decimal places. */
  high_risk_readmission_rate: number
}

/** Response from GET /management/dashboard. */
export interface ManagementDashboard {
  operations: OperationsSummary
  clinical_validation: ReadmissionAnalysis
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/** One dropdown option, from data/IDS_mapping.csv. */
export interface CodeOption {
  code: number
  label: string
}

/** Response from GET /reference/codes. */
export interface ReferenceCodes {
  admission_type_id: CodeOption[]
  discharge_disposition_id: CodeOption[]
}

// ---------------------------------------------------------------------------
// Requests and errors
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** 1 to 500. */
  limit?: number
  offset?: number
}

/** Query for GET /encounters/search. Filters combine with AND. At least one filter is required. */
export interface EncounterSearchParams extends PaginationParams {
  patientNbr?: string
  riskLevel?: RiskLevel
  /** Exact risk score, 0 to 8. */
  riskScore?: number
}

/** Error body shape from FastAPI: `detail` is a string for 404/409 and an array for 422. */
export interface ApiErrorBody {
  detail: string | ValidationErrorItem[]
}

export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}
