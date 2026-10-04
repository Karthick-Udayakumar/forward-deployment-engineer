from fastapi import APIRouter
from data_store import employees

router = APIRouter()

@router.get('/getEmployees')
def get_employee_endpoint():
    return {"Employees": employees}