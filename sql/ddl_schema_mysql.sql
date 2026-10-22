-- =====================================================================
-- MediRecord — Intelligent Clinical Records & Symptom-Similarity Search
-- DDL Script (Option 1: MySQL version — SQL side only)
-- MongoDB collection setup is in mongodb_setup.js
-- =====================================================================

-- Run this first if the database doesn't exist yet:
CREATE DATABASE IF NOT EXISTS medirecord;
USE medirecord;

-- =====================================================================
-- 1. ROLE
-- =====================================================================
CREATE TABLE role (
    role_id     INT AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE,
    CHECK (role_name IN ('Admin', 'Doctor', 'Receptionist'))
) ENGINE=InnoDB;

-- =====================================================================
-- 2. USERS (auth table for all roles)
-- =====================================================================
CREATE TABLE app_user (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_user_email ON app_user(email);

-- =====================================================================
-- 3. DOCTOR (extends app_user for role = Doctor)
-- =====================================================================
CREATE TABLE doctor (
    doctor_id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE,
    specialization      VARCHAR(100) NOT NULL,
    license_no          VARCHAR(50) NOT NULL UNIQUE,
    years_experience    INT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE CASCADE,
    CHECK (years_experience >= 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PATIENT
-- =====================================================================
CREATE TABLE patient (
    patient_id      INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL,
    phone           VARCHAR(15) NOT NULL,
    address         VARCHAR(255),
    blood_group     VARCHAR(5),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (gender IN ('Male', 'Female', 'Other'))
) ENGINE=InnoDB;

CREATE INDEX idx_patient_phone ON patient(phone);

-- =====================================================================
-- 5. APPOINTMENT
-- =====================================================================
CREATE TABLE appointment (
    appointment_id  INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    doctor_id       INT NOT NULL,
    scheduled_at    TIMESTAMP NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_by      INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE RESTRICT,
    FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES app_user(user_id) ON DELETE RESTRICT,
    CHECK (status IN ('scheduled', 'completed', 'cancelled'))
) ENGINE=InnoDB;

CREATE INDEX idx_appointment_scheduled_at ON appointment(scheduled_at);
CREATE INDEX idx_appointment_doctor ON appointment(doctor_id);
CREATE INDEX idx_appointment_patient ON appointment(patient_id);

-- =====================================================================
-- 6. VISIT (one per completed appointment)
-- Note: clinical notes/symptoms live in MongoDB (see mongodb_setup.js).
-- mongo_note_id stores a reference string linking to that document.
-- =====================================================================
CREATE TABLE visit (
    visit_id            INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id      INT NOT NULL UNIQUE,
    vitals_bp           VARCHAR(15),
    vitals_temp         DECIMAL(4,1),
    vitals_pulse        INT,
    diagnosis_code      VARCHAR(20),
    mongo_note_id       VARCHAR(50),   -- references clinical_notes._id in MongoDB
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_visit_diagnosis_code ON visit(diagnosis_code);
CREATE INDEX idx_visit_mongo_note_id ON visit(mongo_note_id);

-- =====================================================================
-- 7. MEDICINE
-- =====================================================================
CREATE TABLE medicine (
    medicine_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    form            VARCHAR(20) NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    stock_qty       INT NOT NULL DEFAULT 0,
    CHECK (form IN ('tablet', 'syrup', 'injection', 'ointment', 'other')),
    CHECK (unit_price >= 0),
    CHECK (stock_qty >= 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. PRESCRIPTION
-- =====================================================================
CREATE TABLE prescription (
    prescription_id     INT AUTO_INCREMENT PRIMARY KEY,
    visit_id            INT NOT NULL UNIQUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visit(visit_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 9. PRESCRIPTION ITEM
-- =====================================================================
CREATE TABLE prescription_item (
    prescription_item_id   INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id        INT NOT NULL,
    medicine_id             INT NOT NULL,
    dosage                  VARCHAR(50) NOT NULL,
    frequency               VARCHAR(50) NOT NULL,
    duration_days           INT NOT NULL,
    FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicine(medicine_id) ON DELETE RESTRICT,
    CHECK (duration_days > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_prescription_item_prescription ON prescription_item(prescription_id);

-- =====================================================================
-- 10. BILL
-- =====================================================================
CREATE TABLE bill (
    bill_id             INT AUTO_INCREMENT PRIMARY KEY,
    visit_id            INT NOT NULL UNIQUE,
    consultation_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,
    medicine_total      DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    generated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visit(visit_id) ON DELETE RESTRICT,
    CHECK (consultation_fee >= 0),
    CHECK (medicine_total >= 0),
    CHECK (tax >= 0),
    CHECK (total_amount >= 0),
    CHECK (payment_status IN ('pending', 'paid', 'refunded'))
) ENGINE=InnoDB;

-- =====================================================================
-- 11. AUDIT LOG
-- =====================================================================
CREATE TABLE audit_log (
    audit_id        INT AUTO_INCREMENT PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INT NOT NULL,
    action          VARCHAR(10) NOT NULL,
    changed_by      INT,
    changed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_value       JSON,
    new_value       JSON,
    FOREIGN KEY (changed_by) REFERENCES app_user(user_id) ON DELETE SET NULL,
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
) ENGINE=InnoDB;

CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);

-- =====================================================================
-- SEED DATA: Roles
-- =====================================================================
INSERT INTO role (role_name) VALUES ('Admin'), ('Doctor'), ('Receptionist');

-- =====================================================================
-- EXAMPLE ALTER / DROP (for demonstration per requirement item 5)
-- =====================================================================
-- ALTER TABLE patient ADD COLUMN emergency_contact VARCHAR(15);
-- ALTER TABLE doctor DROP COLUMN years_experience;
-- DROP TABLE IF EXISTS audit_log;
