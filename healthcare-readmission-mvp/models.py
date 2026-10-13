from pydantic import BaseModel
from typing import Optional

class InterventionUpdate(BaseModel):
    status: str  # e.g., PENDING_REVIEW, ASSIGNED, CONTACTED, FOLLOW_UP_SCHEDULED, CLOSED
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class EncounterResponse(BaseModel):
    encounter_id: str
    patient_nbr: str
    age: Optional[str] = None
    time_in_hospital: int
    risk_score: int
    risk_level: str
    readmitted: Optional[str] = None
    status: Optional[str] = "PENDING_REVIEW"
    assigned_to: Optional[str] = None
    notes: Optional[str] = None