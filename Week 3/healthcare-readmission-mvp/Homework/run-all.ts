// Smoke test for every endpoint in client.ts. For each one it prints the raw response and the UI view.
//
// Usage:
//   node ./Homework/run-all.ts
//   node ./Homework/run-all.ts --write [encounterId] [status] [assignedTo] [notes]
//
// The PATCH call writes to the database, so it only runs when --write is passed.
import {
  listEncounters,
  getEncounterById,
  getCareQueue,
  getHighRiskCareQueue,
  updateIntervention,
  getOperationsSummary,
  getReadmissionAnalysis,
  getManagementDashboard,
  isApiError,
  INTERVENTION_STATUSES,
  type Encounter,
  type CareQueueItem,
  type InterventionStatus,
  type OperationsSummary,
  type ReadmissionAnalysis,
} from "../client.ts";

// ---------------------------------------------------------------------------
// UI views: the fields each screen shows, derived from the API responses
// ---------------------------------------------------------------------------

export interface EncounterListRow {
  encounterId: string;
  patientNbr: string;
  age: string | null;
  timeInHospitalDays: number | null;
  riskLevel: string;
  riskScore: number;
  readmitted: string | null; // "NO" | "<30" | ">30"
}

export interface EncounterDetailView {
  header: { encounterId: string; patientNbr: string; age: string | null };
  risk: { score: number; level: string };
  utilization: { inpatientVisits: number | null; emergencyVisits: number | null; outpatientVisits: number | null };
  clinical: { timeInHospitalDays: number | null; medications: number | null; labProcedures: number | null };
  outcome: { readmitted: string | null };
}

export interface CareQueueRow {
  encounterId: string;
  patientNbr: string;
  riskLevel: string;
  riskScore: number;
  workflowStatus: string; // "NOT_STARTED" when no intervention exists yet
  assignedTo: string | null;
  lastUpdated: string | null;
}

export interface OperationsCards {
  totalEncounters: number;
  riskMix: { high: number; medium: number; low: number };
  pendingInterventions: number;
  completedInterventions: number;
}

export interface ValidationPanelView {
  highRiskPatients: number;
  readmittedUnder30Days: number;
  readmissionRatePercent: string; // formatted for display, e.g. "28.58%"
}

function toListRow(e: Encounter): EncounterListRow {
  return {
    encounterId: e.encounter_id,
    patientNbr: e.patient_nbr,
    age: e.age,
    timeInHospitalDays: e.time_in_hospital,
    riskLevel: e.risk_level,
    riskScore: e.risk_score,
    readmitted: e.readmitted,
  };
}

function toDetailView(e: Encounter): EncounterDetailView {
  return {
    header: { encounterId: e.encounter_id, patientNbr: e.patient_nbr, age: e.age },
    risk: { score: e.risk_score, level: e.risk_level },
    utilization: {
      inpatientVisits: e.number_inpatient,
      emergencyVisits: e.number_emergency,
      outpatientVisits: e.number_outpatient,
    },
    clinical: {
      timeInHospitalDays: e.time_in_hospital,
      medications: e.num_medications,
      labProcedures: e.num_lab_procedures,
    },
    outcome: { readmitted: e.readmitted },
  };
}

function toQueueRow(item: CareQueueItem): CareQueueRow {
  return {
    encounterId: item.encounter_id,
    patientNbr: item.patient_nbr,
    riskLevel: item.risk_level,
    riskScore: item.risk_score,
    workflowStatus: item.status ?? "NOT_STARTED",
    assignedTo: item.assigned_to,
    lastUpdated: item.updated_at,
  };
}

function toCards(s: OperationsSummary): OperationsCards {
  return {
    totalEncounters: s.total_encounters,
    riskMix: { high: s.high_risk, medium: s.medium_risk, low: s.low_risk },
    pendingInterventions: s.pending_interventions,
    completedInterventions: s.completed_interventions,
  };
}

function toValidationPanel(a: ReadmissionAnalysis): ValidationPanelView {
  return {
    highRiskPatients: a.high_risk_patients,
    readmittedUnder30Days: a.high_risk_readmitted_under_30_days,
    readmissionRatePercent: `${a.high_risk_readmission_rate.toFixed(2)}%`,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let failures = 0;

/** Runs one endpoint, prints its raw response and UI view, and records failures without stopping. */
async function step<T>(title: string, call: () => Promise<T>, show: (value: T) => void): Promise<void> {
  console.log(`\n===== ${title}`);
  try {
    const value = await call();
    console.log("Raw response:");
    console.log(JSON.stringify(value, null, 2));
    console.log("UI view:");
    show(value);
  } catch (error) {
    failures++;
    console.error(isApiError(error) ? `${error.code}${error.status ? ` (${error.status})` : ""}: ${error.message}` : error);
  }
}

const logJson = (value: unknown) => console.log(JSON.stringify(value, null, 2));

async function main() {
  const args = process.argv.slice(2);

  await step("01 List encounters", () => listEncounters({ limit: 5 }), (rows) =>
    console.table(rows.map(toListRow)),
  );

  await step("02 Get encounter", () => getEncounterById("2278392"), (e) => logJson(toDetailView(e)));

  await step("03 Care queue (MEDIUM + HIGH)", () => getCareQueue({ limit: 5 }), (rows) =>
    console.table(rows.map(toQueueRow)),
  );

  await step("04 High-risk care queue", () => getHighRiskCareQueue({ limit: 5 }), (rows) =>
    console.table(rows.map(toQueueRow)),
  );

  if (args[0] === "--write") {
    const [encounterId = "67162368", status = "ASSIGNED", assignedTo = "care.manager@example.com", notes = "Scheduled call"] =
      args.slice(1);
    if (!(INTERVENTION_STATUSES as readonly string[]).includes(status)) {
      console.error(`status must be one of: ${INTERVENTION_STATUSES.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    await step(`05 Update intervention (${encounterId} -> ${status})`, () =>
      updateIntervention(encounterId, { status: status as InterventionStatus, assigned_to: assignedTo, notes }),
      (result) => console.log("Banner:", result.message),
    );
  } else {
    console.log("\n===== 05 Update intervention: skipped (writes to the database; pass --write to run)");
  }

  await step("06 Operations summary", () => getOperationsSummary(), (s) => logJson(toCards(s)));

  await step("07 Readmission analysis", () => getReadmissionAnalysis(), (a) => logJson(toValidationPanel(a)));

  await step("08 Management dashboard", () => getManagementDashboard(), (d) =>
    logJson({ operations: toCards(d.operations), clinicalValidation: toValidationPanel(d.clinical_validation) }),
  );

  console.log(`\nDone. ${failures} failure(s).`);
  if (failures > 0) process.exitCode = 1;
}

main();
