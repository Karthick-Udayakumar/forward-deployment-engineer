from fastapi import FastAPI, HTTPException, status
from models import Invoices
from services import find_invoice, process_and_save_invoice
from repository import load_invoices, save_invoices

app = FastAPI(title="Invoice Management System")

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str):
    invoice = find_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    return invoice

@app.post("/invoices/", status_code=status.HTTP_201_CREATED)
def create_invoice(new_invoice: Invoices):
    # 1. Check if it already exists
    if find_invoice(new_invoice.invoice_id):
        raise HTTPException(status_code=400, detail="Invoice ID already exists.")
        
    # 2. Let the service layer process the business logic and write to disk
    result = process_and_save_invoice(new_invoice)
    return result

@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: str):
    if not find_invoice(invoice_id):
        raise HTTPException(status_code=404, detail="Invoice does not exist.")
        
    all_invoices = load_invoices()
    # Filter out the deleted invoice safely matching string formats
    updated_invoices = [inv for inv in all_invoices if str(inv["invoice_id"]) != str(invoice_id)]
    
    save_invoices(updated_invoices)
    return {"message": f"Invoice {invoice_id} successfully deleted."}
