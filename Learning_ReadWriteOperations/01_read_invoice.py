import csv

with open('test_data/homework_invoices.csv', mode = 'r') as file:
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
    
    with open('test_data/invoice_summary.txt', mode = 'w') as summary_file:
        summary_file.write("\n----Processing Summary----")
        summary_file.write(f"Total Invoice read from csv file: {total_invoice_count}")
        summary_file.write(f"Total Number of invoices greater than 100000: {invoice_greater_than_100000}")
        summary_file.write(f"Total Number of invoices missing or Invalid: {total_invoice_missing_invalid}")

print("\nSummary successfully saved to 'data/invoice_summary.txt'")
