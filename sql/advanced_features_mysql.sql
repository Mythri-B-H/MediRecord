-- =====================================================================
-- MediRecord — Advanced Database Features (MySQL version)
-- (Transactions, Triggers, Stored Procedure, Views)
-- Run this AFTER ddl_schema_mysql.sql has created all tables.
-- NoSQL aggregation lives in mongodb_setup.js
-- =====================================================================

USE medirecord;

-- ---------------------------------------------------------------------
-- FEATURE 1: TRIGGERS — Audit logging on Prescription changes
-- ---------------------------------------------------------------------
DELIMITER $$

DROP TRIGGER IF EXISTS trg_prescription_insert$$
CREATE TRIGGER trg_prescription_insert
AFTER INSERT ON prescription
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, new_value)
    VALUES ('prescription', NEW.prescription_id, 'INSERT',
            JSON_OBJECT('prescription_id', NEW.prescription_id, 'visit_id', NEW.visit_id));
END$$

DROP TRIGGER IF EXISTS trg_prescription_update$$
CREATE TRIGGER trg_prescription_update
AFTER UPDATE ON prescription
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_value, new_value)
    VALUES ('prescription', NEW.prescription_id, 'UPDATE',
            JSON_OBJECT('visit_id', OLD.visit_id),
            JSON_OBJECT('visit_id', NEW.visit_id));
END$$

DROP TRIGGER IF EXISTS trg_prescription_delete$$
CREATE TRIGGER trg_prescription_delete
AFTER DELETE ON prescription
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_value)
    VALUES ('prescription', OLD.prescription_id, 'DELETE',
            JSON_OBJECT('visit_id', OLD.visit_id));
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- FEATURE 1b: TRIGGER — Audit logging on Visit updates
-- ---------------------------------------------------------------------
DELIMITER $$

DROP TRIGGER IF EXISTS trg_visit_update$$
CREATE TRIGGER trg_visit_update
AFTER UPDATE ON visit
FOR EACH ROW
BEGIN
    IF NOT (OLD.diagnosis_code <=> NEW.diagnosis_code) THEN
        INSERT INTO audit_log (table_name, record_id, action, old_value, new_value)
        VALUES ('visit', NEW.visit_id, 'UPDATE',
                JSON_OBJECT('diagnosis_code', OLD.diagnosis_code),
                JSON_OBJECT('diagnosis_code', NEW.diagnosis_code));
    END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------------------
-- FEATURE 2: STORED PROCEDURE — Auto-generate a bill for a visit
-- ---------------------------------------------------------------------
DELIMITER $$

DROP PROCEDURE IF EXISTS generate_bill$$
CREATE PROCEDURE generate_bill(
    IN p_visit_id INT,
    IN p_consultation_fee DECIMAL(10,2),
    IN p_tax_rate DECIMAL(5,4)
)
BEGIN
    DECLARE v_medicine_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_tax DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);

    SELECT COALESCE(SUM(m.unit_price * pi.duration_days), 0)
    INTO v_medicine_total
    FROM prescription p
    JOIN prescription_item pi ON pi.prescription_id = p.prescription_id
    JOIN medicine m ON m.medicine_id = pi.medicine_id
    WHERE p.visit_id = p_visit_id;

    SET v_tax = (p_consultation_fee + v_medicine_total) * p_tax_rate;
    SET v_total = p_consultation_fee + v_medicine_total + v_tax;

    INSERT INTO bill (visit_id, consultation_fee, medicine_total, tax, total_amount, payment_status)
    VALUES (p_visit_id, p_consultation_fee, v_medicine_total, v_tax, v_total, 'pending');

    SELECT LAST_INSERT_ID() AS new_bill_id;
END$$

DELIMITER ;

-- Example call:
-- CALL generate_bill(1, 300.00, 0.05);


-- ---------------------------------------------------------------------
-- FEATURE 3: VIEW — Doctor dashboard (single-query fetch)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW doctor_dashboard_view AS
SELECT
    d.doctor_id,
    u.name AS doctor_name,
    d.specialization,
    a.appointment_id,
    p.patient_id,
    p.name AS patient_name,
    a.scheduled_at,
    a.status AS appointment_status,
    v.visit_id,
    v.diagnosis_code,
    v.mongo_note_id,
    b.total_amount,
    b.payment_status
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
JOIN appointment a ON a.doctor_id = d.doctor_id
JOIN patient p ON p.patient_id = a.patient_id
LEFT JOIN visit v ON v.appointment_id = a.appointment_id
LEFT JOIN bill b ON b.visit_id = v.visit_id;


-- ---------------------------------------------------------------------
-- FEATURE 3b: VIEW — Admin analytics (revenue & patient counts per doctor)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW doctor_revenue_summary AS
SELECT
    d.doctor_id,
    u.name AS doctor_name,
    COUNT(DISTINCT a.appointment_id) AS total_appointments,
    COUNT(DISTINCT p.patient_id) AS unique_patients,
    -- revenue counts only bills that have been paid
    COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount END), 0) AS total_revenue
FROM doctor d
JOIN app_user u ON u.user_id = d.user_id
LEFT JOIN appointment a ON a.doctor_id = d.doctor_id
LEFT JOIN patient p ON p.patient_id = a.patient_id
LEFT JOIN visit v ON v.appointment_id = a.appointment_id
LEFT JOIN bill b ON b.visit_id = v.visit_id
GROUP BY d.doctor_id, u.name;


-- ---------------------------------------------------------------------
-- FEATURE 4 (TRANSACTION), FEATURE 5 (NoSQL) and sample DML
-- ---------------------------------------------------------------------
-- Definitions above are the database objects (triggers, procedure, views).
-- Running this file is safe and repeatable: it inserts no data.
--
-- * Transaction demo, trigger proof, JOIN / GROUP BY / HAVING / subquery
--   examples: see demo_queries.sql
-- * Demo data: run  node scripts/seed-demo.js  from the web/ folder
-- * NoSQL text search / aggregation: see ../mongodb/mongodb_setup.js
