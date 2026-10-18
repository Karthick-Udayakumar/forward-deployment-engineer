from pydantic import BaseModel, Field
from typing import Literal, Optional

# Age brackets used in diabetic_data.csv
AgeBracket = Literal[
    "[0-10)", "[10-20)", "[20-30)", "[30-40)", "[40-50)",
    "[50-60)", "[60-70)", "[70-80)", "[80-90)", "[90-100)"
]

class ReadmissionUpdate(BaseModel):
    """Sets the 30-day outcome once the follow-up is complete. NO = not readmitted, <30 = within 30 days, >30 = after 30 days."""
    readmitted: Literal["NO", "<30", ">30"]
    # Changing a value that is already set requires this to be true
    overwrite: bool = False

class EncounterCreate(BaseModel):
    """Fields a client sends to create an encounter. encounter_id, risk_score and risk_level are set by the server."""
    # Mandatory: patient number plus the five inputs the risk score uses
    patient_nbr: str = Field(min_length=1, max_length=50)
    time_in_hospital: int = Field(ge=0)
    number_inpatient: int = Field(ge=0)
    number_emergency: int = Field(ge=0)
    number_outpatient: int = Field(ge=0)
    num_medications: int = Field(ge=0)
    # Optional
    age: Optional[AgeBracket] = None
    num_lab_procedures: Optional[int] = Field(default=None, ge=0)
    admission_type_id: Optional[int] = Field(default=None, ge=1)
    discharge_disposition_id: Optional[int] = Field(default=None, ge=1)

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