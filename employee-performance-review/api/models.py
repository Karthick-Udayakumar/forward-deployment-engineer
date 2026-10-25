from datetime import date, datetime
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, Field, StringConstraints

Rating = Annotated[int, Field(ge=1, le=5)]
PeriodStatus = Literal["Open", "Closed"]

class ReviewCreate(BaseModel):
    """Fields a client sends to create a review. id, average_rating and created_at are set by the server."""
    employee_id: int = Field(ge=1)
    period_id: int = Field(ge=1)
    quality_rating: Rating
    delivery_rating: Rating
    teamwork_rating: Rating
    comments: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]

class Employee(BaseModel):
    id: int
    employee_id: str
    name: str
    department: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None

class ReviewPeriod(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    status: PeriodStatus

class Review(BaseModel):
    id: int
    employee_id: int
    period_id: int
    quality_rating: int
    delivery_rating: int
    teamwork_rating: int
    average_rating: float
    comments: str
    created_at: datetime

class ReviewListItem(Review):
    """A review joined with the employee and period it belongs to. Used by the list and the details screen."""
    employee_code: str
    employee_name: str
    period_name: str
