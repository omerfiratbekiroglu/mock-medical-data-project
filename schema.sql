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


-- Users table for login system
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

INSERT INTO users (email, password)
VALUES ('test@example.com', '1234')
ON CONFLICT (email) DO NOTHING;


