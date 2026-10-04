import json
import os
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent

if (CURRENT_DIR / "data").exists():
    DATA_FILE = CURRENT_DIR / "data" / "invoices.json"
else:
    DATA_FILE = CURRENT_DIR / "Learning_FastAPI_Get_Post_Delete_Put" / "data" / "invoices.json"


def load_invoices() -> list:
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE, "r") as file:
        try:
            return json.load(file)
        except json.JSONDecodeError:
            return []

def save_invoices(invoices_list: list):
    """Writes the updated list of invoices back to the JSON file."""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as file:
        json.dump(invoices_list, file, indent=4)
