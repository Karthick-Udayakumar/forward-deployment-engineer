from fastapi import APIRouter
from models import Employee
from data_store import employees

router = APIRouter()

@router.post('/createEmployee')
def create_employee_endpoint(employee: Employee):
    new_employee = employee.model_dump()
    employees.append(new_employee)
    return {"message": "Employee Created Sucessfully", "data": new_employee}