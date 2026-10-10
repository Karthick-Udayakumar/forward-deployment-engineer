from fastapi import FastAPI

from create_invoice import router as create_invoice_router
from get_invoice import router as get_invoice_router

app = FastAPI()
app.include_router(create_invoice_router)
app.include_router(get_invoice_router)