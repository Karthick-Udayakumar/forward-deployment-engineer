CREATE TABLE patient_encounters (
    encounter_id VARCHAR(50) PRIMARY KEY,
    patient_nbr VARCHAR(50) NOT NULL,
    age VARCHAR(20),
    time_in_hospital INT,
    number_inpatient INT,
    number_emergency INT,
    number_outpatient INT,
    num_medications INT,
    num_lab_procedures INT,
    discharge_disposition_id INT,
    admission_type_id INT,
    readmitted VARCHAR(20),
    risk_score INT DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW'
);

CREATE TABLE care_interventions (
    intervention_id SERIAL PRIMARY KEY,
    encounter_id VARCHAR(50) REFERENCES patient_encounters(encounter_id),
    status VARCHAR(30) DEFAULT 'PENDING_REVIEW',
    assigned_to VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);