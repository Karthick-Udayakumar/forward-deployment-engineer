from psycopg.rows import dict_row
from database import get_connection

_REVIEW_WITH_NAMES = """
    SELECT r.*, e.employee_id AS employee_code, e.name AS employee_name, p.name AS period_name
    FROM performance_reviews r
    JOIN employees e ON e.id = r.employee_id
    JOIN review_periods p ON p.id = r.period_id
"""

def get_employees():
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT * FROM employees ORDER BY employee_id;")
        return cursor.fetchall()

def get_employee_by_id(employee_id: int):
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT * FROM employees WHERE id = %s;", (employee_id,))
        return cursor.fetchone()

def get_review_periods(status=None):
    """All periods, newest first. Pass status to restrict to Open or Closed."""
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            "SELECT * FROM review_periods WHERE (%s::text IS NULL OR status = %s) ORDER BY start_date DESC;",
            (status, status),
        )
        return cursor.fetchall()

def get_period_by_id(period_id: int):
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT * FROM review_periods WHERE id = %s;", (period_id,))
        return cursor.fetchone()

def _review_filters(period_id, employee_id):
    """Only fixed SQL fragments are joined; every user value goes through %s parameters."""
    conditions, params = [], []
    if period_id is not None:
        conditions.append("r.period_id = %s")
        params.append(period_id)
    if employee_id is not None:
        conditions.append("r.employee_id = %s")
        params.append(employee_id)
    return (" AND ".join(conditions) if conditions else "TRUE"), params

def list_reviews(period_id=None, employee_id=None, limit: int = 50, offset: int = 0):
    """Reviews matching every filter given (AND), newest first. Returns (rows, total matching)."""
    where_clause, params = _review_filters(period_id, employee_id)
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            f"{_REVIEW_WITH_NAMES} WHERE {where_clause} ORDER BY r.created_at DESC, r.id DESC LIMIT %s OFFSET %s;",
            params + [limit, offset],
        )
        rows = cursor.fetchall()
        cursor.execute(f"SELECT COUNT(*) AS total FROM performance_reviews r WHERE {where_clause};", params)
        return rows, cursor.fetchone()["total"]

def get_review_by_id(review_id: int):
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(f"{_REVIEW_WITH_NAMES} WHERE r.id = %s;", (review_id,))
        return cursor.fetchone()

def insert_review(data: dict, average_rating: float):
    """
    Inserts a review and returns the saved row, or None when the employee already has a review for that period.
    The duplicate check and the insert are one statement (UNIQUE(employee_id, period_id)), so two requests cannot both insert.
    """
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            INSERT INTO performance_reviews (
                employee_id, period_id, quality_rating, delivery_rating, teamwork_rating, average_rating, comments
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (employee_id, period_id) DO NOTHING
            RETURNING *;
            """,
            (
                data["employee_id"], data["period_id"], data["quality_rating"], data["delivery_rating"],
                data["teamwork_rating"], average_rating, data["comments"],
            ),
        )
        return cursor.fetchone()
