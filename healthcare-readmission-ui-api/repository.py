from psycopg.rows import dict_row
from database import get_connection

def get_all_encounters(limit: int = 100, offset: int = 0):
    """Retrieves a paginated list of all patient encounters."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                "SELECT * FROM patient_encounters ORDER BY encounter_id LIMIT %s OFFSET %s;",
                (limit, offset)
            )
            return cursor.fetchall()

def get_encounter_by_id(encounter_id: str):
    """Retrieves a single encounter by its unique ID."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                "SELECT * FROM patient_encounters WHERE encounter_id = %s;",
                (encounter_id,)
            )
            return cursor.fetchone()

def get_care_queue(min_risk_levels: list, limit: int = 50, offset: int = 0):
    """
    Fetches paginated encounters matching specific risk levels (e.g., ['MEDIUM', 'HIGH']),
    sorted by highest risk score first, joined with their latest care intervention status.
    """
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT pe.*, ci.status, ci.assigned_to, ci.notes, ci.updated_at
                FROM patient_encounters pe
                LEFT JOIN care_interventions ci ON pe.encounter_id = ci.encounter_id
                WHERE pe.risk_level = ANY(%s)
                ORDER BY pe.risk_score DESC, pe.encounter_id
                LIMIT %s OFFSET %s;
                """,
                (min_risk_levels, limit, offset)
            )
            return cursor.fetchall()

def upsert_intervention(encounter_id: str, status: str, assigned_to: str, notes: str):
    """Inserts or updates care intervention tracking for an encounter."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            # Check if an intervention record already exists
            cursor.execute(
                "SELECT intervention_id FROM care_interventions WHERE encounter_id = %s;",
                (encounter_id,)
            )
            exists = cursor.fetchone()

            if exists:
                cursor.execute(
                    """
                    UPDATE care_interventions
                    SET status = %s, assigned_to = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE encounter_id = %s
                    RETURNING *;
                    """,
                    (status, assigned_to, notes, encounter_id)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO care_interventions (encounter_id, status, assigned_to, notes)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *;
                    """,
                    (encounter_id, status, assigned_to, notes)
                )
            conn.commit()
            return cursor.fetchone()

def get_operations_metrics():
    """Calculates operational summary counts dynamically from the database."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM patient_encounters;")
            total = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patient_encounters WHERE risk_level = 'HIGH';")
            high = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patient_encounters WHERE risk_level = 'MEDIUM';")
            medium = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM patient_encounters WHERE risk_level = 'LOW';")
            low = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM care_interventions WHERE status = 'PENDING_REVIEW';")
            pending = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM care_interventions WHERE status = 'CLOSED';")
            completed = cursor.fetchone()[0]

            return {
                "total_encounters": total,
                "high_risk": high,
                "medium_risk": medium,
                "low_risk": low,
                "pending_interventions": pending,
                "completed_interventions": completed
            }

def get_readmission_stats():
    """Compares high-risk prioritization against historical <30-day readmissions."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM patient_encounters WHERE risk_level = 'HIGH';")
            high_risk_total = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT COUNT(*) FROM patient_encounters 
                WHERE risk_level = 'HIGH' AND readmitted = '<30';
                """
            )
            high_risk_readmitted = cursor.fetchone()[0]

            rate = (high_risk_readmitted / high_risk_total * 100) if high_risk_total > 0 else 0.0

            return {
                "high_risk_patients": high_risk_total,
                "high_risk_readmitted_under_30_days": high_risk_readmitted,
                "high_risk_readmission_rate": round(rate, 2)
            }

def insert_encounter(data: dict, risk_score: int, risk_level: str):
    """Inserts a new encounter and returns the saved row. readmitted is left NULL until the follow-up is complete."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO patient_encounters (
                    encounter_id, patient_nbr, age, time_in_hospital,
                    number_inpatient, number_emergency, number_outpatient,
                    num_medications, num_lab_procedures, discharge_disposition_id,
                    admission_type_id, readmitted, risk_score, risk_level
                ) VALUES ('MAN-' || LPAD(nextval('manual_encounter_seq')::text, 6, '0'), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
                RETURNING *;
                """,
                (
                    data["patient_nbr"], data.get("age"), data["time_in_hospital"],
                    data["number_inpatient"], data["number_emergency"], data["number_outpatient"],
                    data["num_medications"], data.get("num_lab_procedures"),
                    data.get("discharge_disposition_id"), data.get("admission_type_id"),
                    risk_score, risk_level
                )
            )
            row = cursor.fetchone()
            conn.commit()
            return row

def search_encounters(patient_nbr=None, risk_level=None, risk_score=None, limit: int = 50, offset: int = 0):
    """
    Returns encounters that match every filter provided (AND). Filters left as None are ignored.
    Each row includes the latest intervention status, the same way the care queue does.
    """
    conditions = []
    params = []
    if patient_nbr is not None:
        conditions.append("pe.patient_nbr = %s")
        params.append(patient_nbr)
    if risk_level is not None:
        conditions.append("pe.risk_level = %s")
        params.append(risk_level)
    if risk_score is not None:
        conditions.append("pe.risk_score = %s")
        params.append(risk_score)

    # Only fixed SQL fragments are joined here; every user value goes through %s parameters
    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    params.extend([limit, offset])

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT pe.*, ci.status, ci.assigned_to, ci.notes, ci.updated_at
                FROM patient_encounters pe
                LEFT JOIN care_interventions ci ON pe.encounter_id = ci.encounter_id
                WHERE {where_clause}
                ORDER BY pe.risk_score DESC, pe.encounter_id
                LIMIT %s OFFSET %s;
                """,
                params
            )
            return cursor.fetchall()

def update_readmitted(encounter_id: str, readmitted: str, overwrite: bool):
    """
    Sets readmitted for an encounter. Returns the updated row, or None when the encounter does not exist
    or the value is already set and overwrite is False. The check and the update happen in one statement,
    so two requests cannot both set the value.
    """
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE patient_encounters
                SET readmitted = %s
                WHERE encounter_id = %s AND (readmitted IS NULL OR %s)
                RETURNING *;
                """,
                (readmitted, encounter_id, overwrite)
            )
            row = cursor.fetchone()
            conn.commit()
            return row

def get_intervention(encounter_id: str):
    """Returns an encounter with its current intervention. Intervention fields are None until the first update."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT pe.encounter_id, pe.patient_nbr, pe.readmitted, ci.status, ci.assigned_to, ci.notes, ci.updated_at
                FROM patient_encounters pe
                LEFT JOIN care_interventions ci ON pe.encounter_id = ci.encounter_id
                WHERE pe.encounter_id = %s;
                """,
                (encounter_id,)
            )
            return cursor.fetchone()