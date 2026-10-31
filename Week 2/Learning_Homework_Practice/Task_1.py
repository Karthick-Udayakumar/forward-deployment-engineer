# ==========================================
# MASTER DATA INPUTS
# ==========================================
invoices = [
    {"invoice_id": "INV-101", "vendor": "ABC Ltd", "amount": 85000, "status": "PENDING", "date": "2026-09-03"},
    {"invoice_id": "INV-102", "vendor": "xyz corp", "amount": 142500, "status": "pending", "date": "2026-09-05"},
    {"invoice_id": "INV-101", "vendor": "ABC Ltd", "amount": 85000, "status": "PENDING", "date": "2026-09-03"},
    {"invoice_id": "INV-103", "vendor": "Globex", "amount": -550000, "status": "PENDING", "date": "2026-09-07"},
    {"invoice_id": "INV-104", "vendor": "ABC Ltd ", "amount": 62000, "status": "PAID", "date": "2026-09-08"},
    {"invoice_id": "INV-102", "vendor": "XYZ Corp", "amount": 150000, "status": "PENDING", "date": "2026-09-12"},
    {"invoice_id": "INV-105", "vendor": "Globex", "amount": 550000, "status": "PENDING", "date": "2026-09-09"},
    {"invoice_id": "INV-106", "vendor": "Initech", "amount": None, "status": "PENDING", "date": "2026-09-15"},
    {"invoice_id": "INV-107", "vendor": "ABC Ltd", "amount": 85000, "status": "PENDING", "date": "2026-09-03"},
]

payments = [
    {"invoice_id": "INV-101", "paid": 85000},
    {"invoice_id": "INV-101", "paid": 85000},
    {"invoice_id": "INV-104", "paid": 60000},
    {"invoice_id": "INV-109", "paid": 12000},
]

# Shared Global Exclusion Blacklist Set
exclude_indices = set()

# --- Task 1: Normalize ---
print("--- Task 1: Normalize ---")
for i in range(len(invoices)):
    row = invoices[i]
    if row["vendor"]:
        row["vendor"] = row["vendor"].strip().title()
    if row["status"]:
        row["status"] = row["status"].strip().upper()
    if row["amount"] is None:
        print(f"Index {i}: Excluded due to missing amount.")
        exclude_indices.add(i)
print("exclude_indices after task 1:", exclude_indices)


# --- Task 2: Exact Duplicates ---
print("\n--- Task 2: Exact Duplicates ---")
exact_dupes = {}
for i in range(len(invoices)):
    if i in exclude_indices:
        continue
    for j in range(i + 1, len(invoices)):
        if j in exclude_indices:
            continue
        # Direct clean dictionary equality check matching all keys/values
        if invoices[i] == invoices[j]:
            key = invoices[i]["invoice_id"]
            if key not in exact_dupes:
                exact_dupes[key] = [i]
            exact_dupes[key].append(j)
            exclude_indices.add(j)
print("exact_dupes:", exact_dupes)
print("exclude_indices now:", exclude_indices)


# --- Task 3: Suspected Duplicates ---
print("\n--- Task 3: Suspected Duplicates ---")
for i in range(len(invoices)):
    if i in exclude_indices:
        continue
    for j in range(i + 1, len(invoices)):
        if j in exclude_indices:
            continue
        matching_fields = (
            invoices[i]["vendor"] == invoices[j]["vendor"] and
            invoices[i]["amount"] == invoices[j]["amount"] and
            invoices[i]["date"] == invoices[j]["date"]
        )
        different_ids = (invoices[i]["invoice_id"] != invoices[j]["invoice_id"])
        if matching_fields and different_ids:
            print(f"Suspected Duplicate: ({invoices[j]['invoice_id']} ~ {invoices[i]['invoice_id']})")


# --- Task 4: Credit Notes ---
print("\n--- Task 4: Credit Notes ---")
for i in range(len(invoices)):
    if i in exclude_indices:
        continue
    row_neg = invoices[i]
    if row_neg["amount"] < 0:
        partner_found = False
        for j in range(len(invoices)):
            if j in exclude_indices or i == j:
                continue
            row_pos = invoices[j]

            if row_pos["vendor"] == row_neg["vendor"] and row_pos["amount"] == abs(row_neg["amount"]):
                invoices[i]["status"] = "CANCELLED"
                invoices[j]["status"] = "CANCELLED"
                exclude_indices.add(i)
                exclude_indices.add(j)
                print(f"Credit Note Matched: {i} <-> {j}")
                partner_found = True
                break
        if not partner_found:
            row_neg["status"] = "CANCELLED"
            exclude_indices.add(i)
            print(f"Orphan Credit Note handled at index {i} (No active match).")
print("exclude_indices now:", exclude_indices)

# --- Task 5: Reconcile Payments ---
print("\n--- Task 5: Reconcile Payments ---")
pay_map = {}
for p in payments:
    pay_map[p["invoice_id"]] = pay_map.get(p["invoice_id"], 0) + p["paid"]

for i in range(len(invoices)):
    if i in exclude_indices:
        continue
    row = invoices[i]
    inv_id = row["invoice_id"]
    total_paid = pay_map.get(inv_id, 0)
    print(f"Invoice: {inv_id} | Vendor: {row['vendor']} | Total Paid: {total_paid} | Status: {row['status']}")
