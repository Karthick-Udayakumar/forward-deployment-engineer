import os
import pandas as pd
from database import get_connection
from service import calculate_risk

def load_data(csv_path: str):
    df = pd.read_csv(csv_path)
    
    # Handle missing numerical fields
    numeric_cols = ['time_in_hospital', 'number_inpatient', 'number_emergency', 
                    'number_outpatient', 'num_medications', 'num_lab_procedures', 
                    'discharge_disposition_id', 'admission_type_id']
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0).astype(int)

    with get_connection() as conn:
        with conn.cursor() as cursor:
            for _, row in df.iterrows():
                row_dict = row.to_dict()
                score, level = calculate_risk(row_dict)
                
                cursor.execute(
                    """
                    INSERT INTO patient_encounters (
                        encounter_id, patient_nbr, age, time_in_hospital,
                        number_inpatient, number_emergency, number_outpatient,
                        num_medications, num_lab_procedures, discharge_disposition_id,
                        admission_type_id, readmitted, risk_score, risk_level
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (encounter_id) DO NOTHING;
                    """,
                    (
                        str(row_dict.get('encounter_id')), str(row_dict.get('patient_nbr')),
                        str(row_dict.get('age', '')), row_dict.get('time_in_hospital'),
                        row_dict.get('number_inpatient'), row_dict.get('number_emergency'),
                        row_dict.get('number_outpatient'), row_dict.get('num_medications'),
                        row_dict.get('num_lab_procedures'), row_dict.get('discharge_disposition_id'),
                        row_dict.get('admission_type_id'), str(row_dict.get('readmitted', '')),
                        score, level
                    )
                )
        conn.commit()
    print("Data loaded and scored successfully!")

if __name__ == "__main__":
    load_data("data/diabetic_data.csv")