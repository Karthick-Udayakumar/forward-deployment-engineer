from fastapi import FastAPI, HTTPException
from models import InterventionUpdate
from repository import (
    get_all_encounters,
    get_encounter_by_id,
    get_care_queue,
    upsert_intervention,
    get_operations_metrics,
    get_readmission_stats
)

app = FastAPI(
    title="Diabetes Readmission Intervention Queue MVP",
    description="FDE Enterprise Healthcare Care-Management Backend",
    version="1.0.0"
)

@app.get("/encounters")
def list_encounters(limit: int = 100, offset: int = 0):
    """Retrieves a paginated list of all patient encounters."""
    return get_all_encounters(limit=limit, offset=offset)

@app.get("/encounters/{encounter_id}")
def get_encounter(encounter_id: str):
    """Retrieves a single patient encounter by its unique ID, raising a 404 if not found."""
    encounter = get_encounter_by_id(encounter_id)
    if not encounter:
        raise HTTPException(status_code=404, detail=f"Encounter ID '{encounter_id}' not found.")
    return encounter

@app.get("/care-queue")
def care_queue(limit: int = 50, offset: int = 0):
    """Returns a paginated queue of MEDIUM and HIGH risk encounters requiring care team attention."""
    return get_care_queue(["MEDIUM", "HIGH"], limit=limit, offset=offset)

@app.get("/care-queue/high")
def high_risk_care_queue(limit: int = 50, offset: int = 0):
    """Returns a paginated queue restricted strictly to HIGH risk encounters."""
    return get_care_queue(["HIGH"], limit=limit, offset=offset)

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