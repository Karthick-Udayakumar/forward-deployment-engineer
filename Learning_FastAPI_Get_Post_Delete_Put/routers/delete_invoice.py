# routers/delete_invoice.py
from fastapi import APIRouter, HTTPException, status
from utils import load_invoices, save_invoices

router = APIRouter()

@router.delete("/invoices/{invoice_id}")
def delete_invoice_endpoint(invoice_id: str):
    # 1. Load the current invoices from JSON
    invoices = load_invoices()
    
    # 2. Search for the invoice index matching the ID
    invoice_to_remove = None
    for inv in invoices:
        if inv.get("invoice_id") == invoice_id:
            invoice_to_remove = inv
            break
            
    # 3. If it doesn't exist, return a 404 error
    if invoice_to_remove is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Invoice not found"
        )
        
    # 4. Remove the item from the list and resave the file
    invoices.remove(invoice_to_remove)
    save_invoices(invoices)
    
    return {"message": f"Invoice {invoice_id} successfully deleted"}
