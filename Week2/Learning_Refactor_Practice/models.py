from pydantic import BaseModel

class Invoices(BaseModel):
    invoice_id : str
    vendor : str
    amount : float
    status : str