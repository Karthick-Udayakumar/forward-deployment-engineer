import type { AgeBracket, InterventionStatus, ReadmissionValue, RiskLevel } from './types'

export interface Option<T extends string | number = string> {
  value: T
  label: string
}

// "Assigned To" roles. The value is what gets stored; the label is what people see.
export const TEAM_ROLES: Option[] = [
  { value: 'CARE_MANAGER', label: 'Care Manager (RN)' },
  { value: 'CASE_MANAGER', label: 'Case Manager / Social Worker' },
  { value: 'PHARMACIST', label: 'Clinical Pharmacist' },
  { value: 'DIABETES_EDUCATOR', label: 'Diabetes Educator' },
  { value: 'DIETITIAN', label: 'Dietitian' },
  { value: 'PHYSICIAN', label: 'Physician / Attending' },
]

export const INTERVENTION_STATUS_OPTIONS: Option<InterventionStatus>[] = [
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'FOLLOW_UP_SCHEDULED', label: 'Follow-up scheduled' },
  { value: 'CLOSED', label: 'Closed' },
]

// 30-day outcome. NO = not readmitted, <30 = within 30 days, >30 = after 30 days.
export const READMISSION_OPTIONS: Option<ReadmissionValue>[] = [
  { value: 'NO', label: 'Not readmitted' },
  { value: '<30', label: 'Readmitted within 30 days' },
  { value: '>30', label: 'Readmitted after 30 days' },
]

export const RISK_LEVEL_OPTIONS: Option<RiskLevel>[] = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' },
]

// Age brackets used in the dataset
export const AGE_BRACKETS: AgeBracket[] = [
  '[0-10)', '[10-20)', '[20-30)', '[30-40)', '[40-50)',
  '[50-60)', '[60-70)', '[70-80)', '[80-90)', '[90-100)',
]

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Pages of the app. The update page is reached from a row in a table, not from the header.
export type AppPage = 'home' | 'high-risk' | 'search' | 'add' | 'update'
