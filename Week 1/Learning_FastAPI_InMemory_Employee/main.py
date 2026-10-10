from fastapi import FastAPI

from create_employee import router as create_employee_router
from get_employee import router as get_employee_router

app = FastAPI()
app.include_router(create_employee_router)
app.include_router(get_employee_router)
