import os
from typing import List, Optional
from fastapi import APIRouter, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from models import Employee, PeriodStatus, Review, ReviewCreate, ReviewListItem, ReviewPeriod
from repository import (
    get_employees, get_employee_by_id, get_review_periods, get_period_by_id,
    list_reviews, get_review_by_id, insert_review,
)
from service import calculate_average, period_accepts_reviews

app = FastAPI(
    title="Employee Performance Review Management",
    description="Requirements, design and API specification: Testleaf",
    version="1.0.0",
)

# Allowed frontend origins come from the environment; never "*" outside local experiments.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Total-Count"],
)

api = APIRouter(prefix="/api")

@api.get("/employees", response_model=List[Employee])
def list_employees():
    """List of employees, for dropdowns."""
    return get_employees()

@api.get("/review-periods", response_model=List[ReviewPeriod])
def list_review_periods(status: Optional[PeriodStatus] = None):
    """List of review periods, newest first. Pass status=Open for the periods that accept new reviews."""
    return get_review_periods(status)

@api.get("/reviews", response_model=List[ReviewListItem])
def reviews(
    response: Response,
    period_id: Optional[int] = Query(default=None, ge=1),
    employee_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """
    Reviews with optional filters (AND), newest first. Empty list when nothing matches.
    The X-Total-Count header holds the number of matching reviews across all pages.
    """
    rows, total = list_reviews(period_id=period_id, employee_id=employee_id, limit=limit, offset=offset)
    response.headers["X-Total-Count"] = str(total)
    return rows

@api.get("/reviews/{review_id}", response_model=ReviewListItem)
def get_review(review_id: int):
    """One review with employee and period names. 404 if missing."""
    review = get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail=f"Review ID '{review_id}' not found.")
    return review

@api.post("/reviews", status_code=201, response_model=Review)
def create_review(payload: ReviewCreate):
    """
    Submits a review. The server calculates average_rating.
    404 if the employee or period does not exist; 409 if the period is closed or the employee already has a review for it.
    """
    if get_employee_by_id(payload.employee_id) is None:
        raise HTTPException(status_code=404, detail=f"Employee ID '{payload.employee_id}' not found.")
    period = get_period_by_id(payload.period_id)
    if period is None:
        raise HTTPException(status_code=404, detail=f"Review period ID '{payload.period_id}' not found.")
    if not period_accepts_reviews(period):
        raise HTTPException(status_code=409, detail=f"Review period '{period['name']}' is closed and cannot accept new reviews.")

    data = payload.model_dump()
    saved = insert_review(data, calculate_average(data))
    if saved is None:
        raise HTTPException(status_code=409, detail="This employee already has a review for this period.")
    return saved

app.include_router(api)
