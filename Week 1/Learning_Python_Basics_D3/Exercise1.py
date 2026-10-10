import json

# Load the JSON data
with open("Learning_Python_Basics_D3/data/invoices.json", mode="r") as file:
    invoices = json.load(file)

def get_totals_by_vendor():
    vendor_totals = {}  # Empty dictionary to store vendor name -> total amount
    
    for invoice in invoices:
        vendor = invoice["vendor"]
        amount = invoice["amount"]
        vendor_totals[vendor] = vendor_totals.get(vendor, 0.0) + amount
            
    return vendor_totals

# Get the aggregated data
invoice_totals = get_totals_by_vendor()

# Print out the results nicely
for vendor, total in invoice_totals.items():
    print(f"Vendor: {vendor} | Total Amount: {total}")
