import csv

with open('data/homework_invoices.csv', mode = 'r') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        invoice = row['invoice_id']
        vendor = row['vendor']
        amount = row['amount'].strip()
        status = row['status']
        print(f"Vendor: {vendor} | Amount: {amount} | Status: {status}")
        
        if not amount:
            print(f"Amount Missing for a vendor: {vendor}")
            continue

        if amount.isalpha():
            print(f"Invalid amount: {vendor}")
            continue

        amountValue = float(amount)

        if amountValue > 100000:
            print(f"Invoice Details: {invoice}")
        
        