import sys
from datetime import date, datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
import main

# The repository is replaced with in-memory fakes, so these tests need no database.
EMPLOYEE = {"id": 1, "employee_id": "EMP101", "name": "John Smith", "department": "Engineering", "email": None, "status": "Active"}
OPEN = {"id": 2, "name": "H1 2026", "start_date": date(2026, 1, 1), "end_date": date(2026, 6, 30), "status": "Open"}
CLOSED = {**OPEN, "id": 1, "name": "H2 2025", "status": "Closed"}
BODY = {"employee_id": 1, "period_id": 2, "quality_rating": 4, "delivery_rating": 5, "teamwork_rating": 4, "comments": "Strong performer."}

@pytest.fixture
def client(monkeypatch):
    saved = {}
    monkeypatch.setattr(main, "get_employee_by_id", lambda i: EMPLOYEE if i == 1 else None)
    monkeypatch.setattr(main, "get_period_by_id", lambda i: {2: OPEN, 1: CLOSED}.get(i))

    def insert(data, average):
        key = (data["employee_id"], data["period_id"])
        if key in saved:
            return None
        saved[key] = {"id": len(saved) + 1, **data, "average_rating": average, "created_at": datetime(2026, 1, 15, 10, 30)}
        return saved[key]

    monkeypatch.setattr(main, "insert_review", insert)
    return TestClient(main.app)

def test_create_calculates_average(client):
    response = client.post("/api/reviews", json=BODY)
    assert response.status_code == 201
    assert response.json()["average_rating"] == 4.33

def test_duplicate_is_409(client):
    client.post("/api/reviews", json=BODY)
    assert client.post("/api/reviews", json=BODY).status_code == 409

def test_closed_period_is_409(client):
    assert client.post("/api/reviews", json={**BODY, "period_id": 1}).status_code == 409

def test_unknown_employee_or_period_is_404(client):
    assert client.post("/api/reviews", json={**BODY, "employee_id": 99}).status_code == 404
    assert client.post("/api/reviews", json={**BODY, "period_id": 99}).status_code == 404

@pytest.mark.parametrize("change", [
    {"quality_rating": 0}, {"delivery_rating": 6}, {"teamwork_rating": "x"}, {"comments": "   "}, {"comments": ""},
])
def test_invalid_input_is_422(client, change):
    assert client.post("/api/reviews", json={**BODY, **change}).status_code == 422

def test_list_sets_total_header(client, monkeypatch):
    monkeypatch.setattr(main, "list_reviews", lambda **kw: ([], 12))
    response = client.get("/api/reviews?limit=5")
    assert response.json() == [] and response.headers["X-Total-Count"] == "12"

def test_missing_review_is_404(client, monkeypatch):
    monkeypatch.setattr(main, "get_review_by_id", lambda i: None)
    assert client.get("/api/reviews/5").status_code == 404
