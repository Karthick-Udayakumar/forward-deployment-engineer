import csv

with open('data/homework_invoices.csv', mode = 'r') as file:
    csv_reader = csv.DictReader(file)
    total_invoice_count = 0
    invoice_greater_than_100000 = 0
    total_invoice_missing_invalid = 0
    print(f"\n-----Invoice Summary----")

    for row in csv_reader:
        total_invoice_count +=1
        invoice = row['invoice_id']
        vendor = row['vendor']
        amount = row['amount'].strip()
        status = row['status']
        print(f"Vendor: {vendor} | Amount: {amount} | Status: {status}")
        
        try:
            amountValue = float(amount)
        except ValueError:
            if not amount or amount.isalpha():
                total_invoice_missing_invalid +=1
            
        if amountValue > 100000:
            invoice_greater_than_100000+=1
    
    print("\n----Processing Summary----")    
    print(f"Total Invoice read from csv file: {total_invoice_count}")
    print(f"Total Number of invoices greater than 100000: {invoice_greater_than_100000}")
    print(f"Total Number of invoices missing or Invalid: {total_invoice_missing_invalid}")