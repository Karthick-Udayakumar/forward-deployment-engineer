from fastapi import FastAPI
from routers.create_invoice import router as create_invoice_router
from routers.get_invoices import router as get_invoices_router
from routers.delete_invoice import router as delete_invoice_router
from routers.update_invoice import router as update_invoice_router 

app = FastAPI(title="Invoice Manager API")

app.include_router(create_invoice_router)
app.include_router(get_invoices_router)
app.include_router(delete_invoice_router)
app.include_router(update_invoice_router) 

@app.get("/")
def root():
    return {"status": "API is running successfully"}
