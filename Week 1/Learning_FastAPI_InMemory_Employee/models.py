from pydantic import BaseModel

class Employee(BaseModel):
    employee_number:int
    employee_name: str
    employee_location: str
    employee_salary: float
    employee_designation: str