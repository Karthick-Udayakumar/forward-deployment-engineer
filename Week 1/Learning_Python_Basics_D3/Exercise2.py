import json

# Load the JSON data
with open("Learning_Python_Basics_D3/data/invoices.json", mode="r") as file:
    invoices = json.load(file)

def get_only_duplicates_with_set():
    seen_vendors = set()       # Keeps track of EVERY vendor we see once
    duplicate_vendors = set()  # Strictly holds vendors we see MORE than once
    vendor_totals = {}         # To keep track of the total amounts
    
    for invoice in invoices:
        vendor = invoice["vendor"]
        amount = invoice["amount"]
        
        # Accumulate the totals for everyone just like before
        vendor_totals[vendor] = vendor_totals.get(vendor, 0.0) + amount
        
        # IF we have already seen this vendor before, it's a duplicate!
        if vendor in seen_vendors:
            duplicate_vendors.add(vendor)  # Add it to our duplicates set
        else:
            seen_vendors.add(vendor)       # First time seeing it, add to seen set
            
    # Create our final filtered dictionary using the duplicates set
    filtered_duplicates = {}
    for vendor in duplicate_vendors:
        filtered_duplicates[vendor] = vendor_totals[vendor]
        
    return filtered_duplicates

# Get the duplicates
duplicates = get_only_duplicates_with_set()

# Print the results
print("--- Duplicate Vendors Found Using Sets ---")
for vendor, total in duplicates.items():
    print(f"Vendor: {vendor} | Combined Total Amount: {total}")
