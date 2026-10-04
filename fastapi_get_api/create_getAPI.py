from fastapi import FastAPI

app = FastAPI()

invoices = [
    {'id': 101, 'name': 'Karthick', 'status': 'Paid'},
    {'id': 102, 'name': 'Aiden', 'status': 'Not Paid'},
    {'id': 103, 'name': 'Sam', 'status': 'paid'}
]

@app.get('/')
def root():
    return {"message": "Welcome to the Invoice API"}

@app.get('/invoices')
def get_invoices():
    return invoices


employee = [
    {'employeeid': 4567, 'employee_name': 'Karthick', 'Status': 'Active', 'employment':{'companyname': 'tcs', 'location': 'chennai'}},
    {'employeeid': 4788, 'employee_name': 'Ambrane', 'Status': 'Not active', 'employment': {'companyname': 'cognizant', 'location': 'chennai'}}
]

@app.get("/employee")
def employee_details():
    return employee