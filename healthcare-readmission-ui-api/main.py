from pathlib import Path
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from models import InterventionUpdate, EncounterCreate, ReadmissionUpdate
from repository import (
    get_all_encounters,
    get_encounter_by_id,
    get_care_queue,
    upsert_intervention,
    get_operations_metrics,
    get_readmission_stats,
    insert_encounter,
    search_encounters,
    get_intervention,
    update_readmitted
)
from service import calculate_risk, REFERENCE_CODES

app = FastAPI(
    title="Diabetes Readmission Intervention Queue MVP",
    description="FDE Enterprise Healthcare Care-Management Backend",
    version="1.0.0"
)

# Local development only: lets layout.html (opened from file:// or any local server) call the API.
# Restrict allow_origins to the real frontend origin before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "PATCH"],
    allow_headers=["Content-Type"],
)

@app.get("/encounters")
def list_encounters(limit: int = 100, offset: int = 0):
    """Retrieves a paginated list of all patient encounters."""
    return get_all_encounters(limit=limit, offset=offset)

@app.get("/encounters/search")
def search_encounters_endpoint(
    patient_nbr: Optional[str] = Query(default=None, min_length=1, max_length=50),
    risk_level: Optional[Literal["LOW", "MEDIUM", "HIGH"]] = None,
    risk_score: Optional[int] = Query(default=None, ge=0, le=8),  # 0-8 is the full range of the risk rule
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """
    Searches encounters by patient number, risk level and/or risk score. Any combination works; filters combine with AND.
    Returns an empty list when nothing matches.
    """
    if patient_nbr is None and risk_level is None and risk_score is None:
        raise HTTPException(status_code=422, detail="Provide at least one filter: patient_nbr, risk_level or risk_score.")
    return search_encounters(
        patient_nbr=patient_nbr,
        risk_level=risk_level,
        risk_score=risk_score,
        limit=limit,
        offset=offset,
    )

@app.get("/encounters/{encounter_id}")
def get_encounter(encounter_id: str):
    """Retrieves a single patient encounter by its unique ID, raising a 404 if not found."""
    encounter = get_encounter_by_id(encounter_id)
    if not encounter:
        raise HTTPException(status_code=404, detail=f"Encounter ID '{encounter_id}' not found.")
    return encounter

@app.post("/encounters", status_code=201)
def create_encounter(payload: EncounterCreate):
    """Creates a new encounter. The server generates encounter_id and calculates risk_score and risk_level."""
    data = payload.model_dump()
    risk_score, risk_level = calculate_risk(data)
    return insert_encounter(data, risk_score, risk_level)

@app.get("/care-queue")
def care_queue(limit: int = 50, offset: int = 0):
    """Returns a paginated queue of MEDIUM and HIGH risk encounters requiring care team attention."""
    return get_care_queue(["MEDIUM", "HIGH"], limit=limit, offset=offset)

@app.get("/care-queue/high")
def high_risk_care_queue(limit: int = 50, offset: int = 0):
    """Returns a paginated queue restricted strictly to HIGH risk encounters."""
    return get_care_queue(["HIGH"], limit=limit, offset=offset)

@app.patch("/encounters/{encounter_id}")
def update_encounter_readmission(encounter_id: str, payload: ReadmissionUpdate):
    """
    Sets the 30-day readmission outcome after follow-up. Does not change the risk score.
    Returns 404 if the encounter does not exist, and 409 if readmitted is already set unless overwrite is true.
    """
    updated = update_readmitted(encounter_id, payload.readmitted, payload.overwrite)
    if updated:
        return updated
    if get_encounter_by_id(encounter_id) is None:
        raise HTTPException(status_code=404, detail=f"Encounter ID '{encounter_id}' not found.")
    raise HTTPException(
        status_code=409,
        detail="readmitted is already set for this encounter. Send overwrite: true to change it.",
    )

@app.get("/interventions/{encounter_id}")
def get_intervention_for_encounter(encounter_id: str):
    """Returns the encounter's current intervention status, owner and notes. 404 if the encounter does not exist."""
    row = get_intervention(encounter_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Encounter ID '{encounter_id}' not found.")
    return row

@app.patch("/interventions/{encounter_id}")
def update_intervention(encounter_id: str, payload: InterventionUpdate):
    """Updates or creates workflow status, assigned care team owner, and notes for an encounter."""
    encounter = get_encounter_by_id(encounter_id)
    if not encounter:
        raise HTTPException(status_code=404, detail=f"Encounter ID '{encounter_id}' not found.")
    
    updated = upsert_intervention(
        encounter_id=encounter_id,
        status=payload.status,
        assigned_to=payload.assigned_to,
        notes=payload.notes
    )
    return {"message": "Intervention updated successfully", "data": updated}

@app.get("/reference/codes")
def get_reference_codes():
    """Code lists for dropdowns: admission types and discharge dispositions, from data/IDS_mapping.csv."""
    return {
        "admission_type_id": REFERENCE_CODES.get("admission_type_id", []),
        "discharge_disposition_id": REFERENCE_CODES.get("discharge_disposition_id", []),
    }

@app.get("/operations/summary")
def operations_summary():
    """Provides operational metrics and queue backlogs calculated from database records."""
    return get_operations_metrics()

@app.get("/operations/readmission-analysis")
def readmission_analysis():
    """Evaluates risk prioritization against historical <30-day readmission outcomes."""
    return get_readmission_stats()

@app.get("/management/dashboard")
def management_dashboard():
    """Executive summary combining overall operational metrics and clinical validation signals."""
    return {
        "operations": get_operations_metrics(),
        "clinical_validation": get_readmission_stats()
    }

# Serve the browser pages in ui/ from the same origin as the API, e.g. http://127.0.0.1:8000/ui/search.html
app.mount("/ui", StaticFiles(directory=Path(__file__).parent / "ui", html=True), name="ui")