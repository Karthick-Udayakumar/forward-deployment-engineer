from __future__ import annotations  # Keeps Python 3.14 happy
from fastapi import APIRouter, HTTPException
from utils import load_invoices

router = APIRouter()

# 1. Route to get ALL invoices
@router.get("/invoices")
def get_invoices_endpoint():
    return load_invoices()

# 2. Route to get a SINGLE invoice by its ID (or return 404)
@router.get("/invoices/{invoice_id}")
def get_single_invoice_endpoint(invoice_id: str):
    # Fetch the list of invoices using your utility function
    invoices = load_invoices()
    
    # Loop through the list to look for a matching invoice_id
    for invoice in invoices:
        if invoice.get("invoice_id") == invoice_id:
            return invoice  # Return the matching invoice directly
            
    # If the loop finishes without finding a match, throw a 404 error
    raise HTTPException(status_code=404, detail=f"Invoice with ID {invoice_id} not found")
