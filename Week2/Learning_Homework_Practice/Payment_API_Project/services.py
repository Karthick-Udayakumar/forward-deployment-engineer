import uuid
from typing import List, Optional
from models import Payment, PaymentUpdate
from repository import load_payments, save_payments

def fetch_all() -> List[Payment]:
    """Loads raw dictionaries from repository and instantiates them as valid Pydantic models."""
    raw_list = load_payments()
    return [Payment(**item) for item in raw_list]

def fetch_by_id(pay_id: str) -> Optional[Payment]:
    """Finds a specific payment using Pydantic object dot notation accessors."""
    all_payments = fetch_all()
    for p in all_payments:
        if p.payment_id == pay_id:
            return p
    return None

def add_payment(new_pay: Payment) -> Payment:
    all_payments_raw = load_payments()
    
    # Generate unique transaction id identifier token if missing
    if not new_pay.payment_id:
        new_pay.payment_id = f"PAY-{uuid.uuid4().hex[:6].upper()}"
    
    # Store the dictionary representation back to the database array
    all_payments_raw.append(new_pay.model_dump())
    save_payments(all_payments_raw)
    return new_pay

def update_payment(pay_id: str, payload: PaymentUpdate) -> Optional[Payment]:
    all_payments_raw = load_payments()
    for p in all_payments_raw:
        if p.get("payment_id") == pay_id:
            p["paid"] = payload.paid
            save_payments(all_payments_raw)
            # Return as a typed Pydantic object instance to keep controllers synchronized
            return Payment(**p)
    return None

def remove_payment(pay_id: str) -> bool:
    all_payments_raw = load_payments()
    initial_len = len(all_payments_raw)
    filtered = [p for p in all_payments_raw if p.get("payment_id") != pay_id]
    
    if len(filtered) == initial_len:
        return False
        
    save_payments(filtered)
    return True
