from fastapi import APIRouter
from data_store import invoices

router = APIRouter()

@router.get('/getInvoices')
def get_invoices_endpoint():
    return {"invoices": invoices}