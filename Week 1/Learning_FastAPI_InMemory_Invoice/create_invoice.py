from fastapi import APIRouter
from data_store import invoices
from models import Invoice

router = APIRouter()

@router.post('/CreateInvoice')
def create_invoice_endpoint(invoice: Invoice):
    #Model_dump -> Turns your data into a python dictionary
    new_invoice = invoice.model_dump()
    invoices.append(new_invoice)
    return {"message": "Invoice Created Succesfully", "data" : new_invoice}