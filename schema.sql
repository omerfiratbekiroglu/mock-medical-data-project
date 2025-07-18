CREATE TABLE IF NOT EXISTS encrypted_vitals (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(255),
    encrypted_data TEXT NOT NULL,
    time TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    uuid UUID NOT NULL UNIQUE,
    seq_no BIGINT,
    late BOOLEAN DEFAULT false,
    
    CONSTRAINT uniq_patient_seq UNIQUE (patient_id, seq_no)
);
