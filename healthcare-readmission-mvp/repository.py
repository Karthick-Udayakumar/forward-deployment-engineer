from psycopg.rows import dict_row
from database import get_connection

def get_all_encounters(limit: int = 100, offset: int = 0):
    """Retrieves a paginated list of all patient encounters."""
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                "SELECT * FROM patient_encounters LIMIT %s OFFSET %s;",
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
                ORDER BY pe.risk_score DESC
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