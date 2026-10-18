import csv
from pathlib import Path


def calculate_risk(encounter: dict):
    score = 0
    if encounter.get("number_inpatient", 0) >= 3:
        score += 3
    if encounter.get("number_emergency", 0) >= 2:
        score += 2
    if encounter.get("number_outpatient", 0) >= 3:
        score += 1
    if encounter.get("time_in_hospital", 0) >= 7:
        score += 1
    if encounter.get("num_medications", 0) >= 20:
        score += 1

    if score >= 5:
        level = "HIGH"
    elif score >= 3:
        level = "MEDIUM"
    else:
        level = "LOW"
        
    return score, level

def load_code_lists(path) -> dict:
    """
    Reads the code tables in IDS_mapping.csv. Each table starts with a header row such as
    'admission_type_id,description', and tables are separated by blank lines.
    Returns {header_name: [{"code": int, "label": str}, ...]}, sorted by code.
    """
    tables: dict = {}
    current = None
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.reader(handle):
            cells = [cell.strip() for cell in row]
            if not any(cells):
                current = None
                continue
            if len(cells) == 2 and cells[1] == "description":
                current = cells[0]
                tables[current] = []
                continue
            if current is not None and len(cells) >= 2 and cells[0].isdigit():
                tables[current].append({"code": int(cells[0]), "label": cells[1]})
    for rows in tables.values():
        rows.sort(key=lambda item: item["code"])
    return tables

REFERENCE_CODES = load_code_lists(Path(__file__).parent / "data" / "IDS_mapping.csv")