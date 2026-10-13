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