# routers/create_invoice.py
from fastapi import APIRouter
from models import Invoice
from utils import load_invoices, save_invoices

router = APIRouter()

@router.post("/invoices")
def create_invoice_endpoint(invoice: Invoice):
    # 1. Load the existing invoices from JSON
    current_invoices = load_invoices()
    
    # 2. Convert Pydantic object to dict and add it to the list
    new_invoice_data = invoice.model_dump()
    current_invoices.append(new_invoice_data)
    
    # 3. Save the updated list back to the JSON file
    save_invoices(current_invoices)
    
    # 4. Return the created invoice data
    return {"message": "Invoice created successfully", "data": new_invoice_data}
