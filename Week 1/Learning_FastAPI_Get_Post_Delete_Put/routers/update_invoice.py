from fastapi import APIRouter, HTTPException, status
from models import Invoice
from utils import load_invoices, save_invoices

router = APIRouter()

@router.put("/invoices/{invoice_id}")
def update_invoice_endpoint(invoice_id: str, updated_invoice: Invoice):
    """Loads invoices, updates the matching ID with new Pydantic data, and saves."""
    # 1. Load the current invoices from your JSON file
    invoices = load_invoices()
    
    # 2. Search for the invoice matching the URL parameter ID
    invoice_index = None
    for index, inv in enumerate(invoices):
        if inv.get("invoice_id") == invoice_id:
            invoice_index = index
            break
            
    # 3. If it doesn't exist, raise a 404 error
    if invoice_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Invoice {invoice_id} not found"
        )
        
    # 4. Convert incoming Pydantic payload to a dictionary
    new_data = updated_invoice.model_dump()
    
    # Safety Check: Ensure they aren't trying to change the ID in the body to mismatch the URL
    new_data["invoice_id"] = invoice_id
    
    # 5. Overwrite the old record with the updated dictionary data
    invoices[invoice_index] = new_data
    
    # 6. Save the list back down to data/invoices.json
    save_invoices(invoices)
    
    return {"message": f"Invoice {invoice_id} successfully updated", "data": new_data}
