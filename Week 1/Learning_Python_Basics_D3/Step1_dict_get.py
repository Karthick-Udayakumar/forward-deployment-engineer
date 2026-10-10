invoices = {
    "Invoice_ID": 1,
    "Amount": 1000,
    "Status": "Pending"
}

#print(invoices["vendor"]) #KeyError: 'vendor'

print(invoices.get("vendor")) #None

print(invoices.get("vendor","NOT AVAILABLE")) # Constant: UPPERCASE