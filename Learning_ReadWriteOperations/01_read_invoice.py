import csv

with open('test_data/homework_invoices.csv', mode='r') as file:
    csv_reader = csv.DictReader(file)
    total_invoice_count = 0
    invoice_greater_than_100000 = 0
    total_invoice_missing_invalid = 0
    
    print("\n-----Invoice Details-----")

    for row in csv_reader:
        total_invoice_count += 1
        invoice = row.get('invoice_id', '').strip()
        vendor = row.get('vendor', '').strip()
        amount = row.get('amount', '').strip()
        status = row.get('status', '').strip()
        
        print(f"Vendor: {vendor} | Amount: {amount} | Status: {status}")
        
        # 1. Safe Try/Except conversion
        try:
            amountValue = float(amount)
        except ValueError:
            total_invoice_missing_invalid += 1
            # 2. Skip to the next row immediately if the amount is broken
            continue 
            
        # 3. Safe to check now, since amountValue is guaranteed to exist here
        if amountValue > 100000:
            invoice_greater_than_100000 += 1
    
    # 4. Open summary file and include missing newlines (\n)
    with open('test_data/invoice_summary.txt', mode='w') as summary_file:
        summary_file.write("----Processing Summary----\n")
        summary_file.write(f"Total Invoice read from csv file: {total_invoice_count}\n")
        summary_file.write(f"Total Number of invoices greater than 100000: {invoice_greater_than_100000}\n")
        summary_file.write(f"Total Number of invoices missing or Invalid: {total_invoice_missing_invalid}\n")

# 5. Kept file paths matching perfectly
print("\nSummary successfully saved to 'test_data/invoice_summary.txt'")