from models import Invoices
from repository import load_invoices, save_invoices

def find_invoice(invoice_id: str) -> dict | None:
    """Finds an invoice dictionary from the list."""
    invoices_list = load_invoices()
    for invoice in invoices_list:
        # Pydantic dict values might be saved as keys
        if str(invoice.get("invoice_id")) == str(invoice_id):
            return invoice
    return None

def process_and_save_invoice(new_invoice: Invoices) -> dict:
    """
    Handles BOTH adding the invoice AND determining its approval state,
    then writes it to the JSON file safely in a single flow.
    """
    # 1. Load the current raw list from repository
    all_invoices = load_invoices()
    
    # 2. Check business logic rules using Pydantic properties
    if new_invoice.amount < 5000.0:
        new_invoice.status = 2  # Approved
        message = "Invoice automatically approved (Amount under 5000)."
    else:
        new_invoice.status = 3  # Manual Review Required
        message = "Invoice flagged for manual review (Amount 5000 or higher)."
        
    # 3. Convert Pydantic object to a dictionary and append to the list
    all_invoices.append(new_invoice.model_dump())
    
    # 4. CRITICAL: Pass the complete list to repository to execute json.dump()
    save_invoices(all_invoices)
    
    return {"message": message, "invoice": new_invoice.model_dump()}
