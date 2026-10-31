from fastapi import FastAPI, HTTPException, status
from typing import List
from models import Payment, PaymentUpdate
import services as api_service

app = FastAPI(title="Payment Ledger API Engine Engine", version="1.0.0")

@app.get("/payments/", response_model=List[Payment], status_code=status.HTTP_200_OK)
def get_all_payments():
    """Retrieves all validated payment records from disk."""
    return api_service.fetch_all()

@app.get("/payments/{payment_id}", response_model=Payment)
def get_single_payment(payment_id: str):
    """Fetches a specific transaction payload by its record ID."""
    record = api_service.fetch_by_id(payment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Payment transaction reference not found.")
    return record

@app.post("/payments/", response_model=Payment, status_code=status.HTTP_201_CREATED)
def create_payment(payload: Payment):
    """Logs a new transactional customer payment installment."""
    return api_service.add_payment(payload)

@app.put("/payments/{payment_id}", response_model=Payment)
def update_payment(payment_id: str, payload: PaymentUpdate):
    """Updates the total value amount of an existing settlement allocation record."""
    updated = api_service.update_payment(payment_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Target transaction matching payload not found.")
    return updated

@app.delete("/payments/{payment_id}")
def delete_payment(payment_id: str):
    """Removes a payment asset log completely from processing archives."""
    success = api_service.remove_payment(payment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Requested payment log element cannot be identified.")
    return {"message": f"Payment element {payment_id} successfully purged."}
