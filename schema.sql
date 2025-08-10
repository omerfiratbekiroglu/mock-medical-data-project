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

-- Users tablosuna eksik kolonları ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'patient';
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255); 
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_patients TEXT;

INSERT INTO users (email, password, role, first_name, last_name)
VALUES ('test@example.com', '1234', 'patient', 'Test', 'User')
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- Örnek caregiver ve doctor ekle
INSERT INTO users (email, password, role, first_name, last_name, assigned_patients)
VALUES 
    ('caregiver@test.com', '1234', 'caregiver', 'Jane', 'Nurse', '1,2'),
    ('doctor@test.com', '1234', 'doctor', 'Dr. John', 'Smith', NULL)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    assigned_patients = EXCLUDED.assigned_patients;


  CREATE TABLE IF NOT EXISTS caregiver_notes (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      caregiver_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      care_level INTEGER NOT NULL CHECK (care_level >= 1 AND care_level <= 5),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),

      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Index for performance
  CREATE INDEX IF NOT EXISTS idx_caregiver_notes_patient_id ON caregiver_notes(patient_id);
  CREATE INDEX IF NOT EXISTS idx_caregiver_notes_caregiver_id ON caregiver_notes(caregiver_id);
  CREATE INDEX IF NOT EXISTS idx_caregiver_notes_care_level ON caregiver_notes(care_level);
  CREATE INDEX IF NOT EXISTS idx_caregiver_notes_created_at ON caregiver_notes(created_at DESC);


