import json
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent

DATA_FILE = CURRENT_DIR / "data" / "payments.json"

def load_payments() -> list:
    
    if not DATA_FILE.exists():
        return []
        
    with open(DATA_FILE, "r") as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []

def save_payments(payments_list: list):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as file:
        json.dump(payments_list, file, indent=4)
