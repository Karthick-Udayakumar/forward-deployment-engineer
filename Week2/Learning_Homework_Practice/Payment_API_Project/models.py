from pydantic import BaseModel, Field
from typing import Optional

class Payment(BaseModel):
    payment_id: Optional[str] = Field(default=None, description="Automatically generated if empty")
    invoice_id: str = Field(..., description="Target Invoice identifier reference link")
    paid: float = Field(..., gt=0, description="Amount paid must be greater than zero")

    class Config:
        from_attributes = True

class PaymentUpdate(BaseModel):
    paid: float = Field(..., gt=0, description="Updated installment payment allocation value")
