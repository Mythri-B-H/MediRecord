-- =====================================================================
-- MediRecord — DEMO QUERIES (run top to bottom, or one section at a time)
--
--   mysql -u root -p medirecord < sql/demo_queries.sql
--   (or open mysql and:  USE medirecord;  then paste a section)
--
-- Prerequisite: demo data loaded with  node scripts/seed-demo.js
-- Everything here is re-runnable: write demos clean up after themselves
-- (explicit DELETE, or ROLLBACK), so the data set is unchanged afterwards.
-- =====================================================================
USE medirecord;

-- ---------------------------------------------------------------------
-- 1. OVERVIEW — what is in the database (11 tables)
-- ---------------------------------------------------------------------
SELECT '1. TABLE OVERVIEW' AS demo_section;
SELECT 'role' AS table_name, COUNT(*) AS row_count FROM role
UNION ALL SELECT 'app_user', COUNT(*) FROM app_user
UNION ALL SELECT 'doctor', COUNT(*) FROM doctor
UNION ALL SELECT 'patient', COUNT(*) FROM patient
UNION ALL SELECT 'appointment', COUNT(*) FROM appointment
UNION ALL SELECT 'visit', COUNT(*) FROM visit
UNION ALL SELECT 'medicine', COUNT(*) FROM medicine
UNION ALL SELECT 'prescription', COUNT(*) FROM prescription
UNION ALL SELECT 'prescription_item', COUNT(*) FROM prescription_item
UNION ALL SELECT 'bill', COUNT(*) FROM bill
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log;

-- ---------------------------------------------------------------------
-- 2. DML — INSERT / UPDATE / DELETE (leaves no trace)
-- ---------------------------------------------------------------------
SELECT '2. DML: INSERT, UPDATE, DELETE' AS demo_section;

INSERT INTO patient (name, dob, gender, phone, address, blood_group)
VALUES ('Demo Patient', '2000-01-01', 'Other', '9000000000', 'Bengaluru', 'O+');

SELECT patient_id, name, phone FROM patient WHERE name = 'Demo Patient';

UPDATE patient SET phone = '9111111111' WHERE name = 'Demo Patient';

SELECT patient_id, name, phone AS phone_after_update FROM patient WHERE name = 'Demo Patient';

DELETE FROM patient WHERE name = 'Demo Patient';

SELECT COUNT(*) AS demo_patient_rows_left FROM patient WHERE name = 'Demo Patient';

-- ---------------------------------------------------------------------
-- 3. JOIN — appointments with patient, doctor and specialization (4 tables)
-- ---------------------------------------------------------------------
SELECT '3. JOIN (appointment + patient + doctor + app_user)' AS demo_section;
SELECT a.appointment_id,
       p.name           AS patient,
       u.name           AS doctor,
       d.specialization,
       a.scheduled_at,
       a.status
FROM appointment a
JOIN patient  p ON p.patient_id = a.patient_id
JOIN doctor   d ON d.doctor_id  = a.doctor_id
JOIN app_user u ON u.user_id    = d.user_id
ORDER BY a.scheduled_at;

-- LEFT JOIN — every appointment, even those with no visit/bill yet
SELECT '3b. LEFT JOIN (appointments that have no visit yet)' AS demo_section;
SELECT a.appointment_id, p.name AS patient, a.status, v.visit_id
FROM appointment a
JOIN patient p ON p.patient_id = a.patient_id
LEFT JOIN visit v ON v.appointment_id = a.appointment_id
WHERE v.visit_id IS NULL;

-- ---------------------------------------------------------------------
-- 4. GROUP BY + HAVING + aggregates
-- ---------------------------------------------------------------------
SELECT '4. GROUP BY / HAVING: doctors with at least 4 completed visits' AS demo_section;
SELECT u.name AS doctor,
       d.specialization,
       COUNT(v.visit_id) AS completed_visits
FROM doctor d
JOIN app_user u        ON u.user_id = d.user_id
JOIN appointment a     ON a.doctor_id = d.doctor_id
JOIN visit v           ON v.appointment_id = a.appointment_id
GROUP BY d.doctor_id, u.name, d.specialization
HAVING COUNT(v.visit_id) >= 4
ORDER BY completed_visits DESC;

SELECT '4b. GROUP BY / HAVING: diagnoses seen more than once' AS demo_section;
SELECT diagnosis_code, COUNT(*) AS cases
FROM visit
GROUP BY diagnosis_code
HAVING COUNT(*) > 1
ORDER BY cases DESC;

SELECT '4c. Aggregates: billing summary by payment status' AS demo_section;
SELECT payment_status,
       COUNT(*)            AS bills,
       SUM(total_amount)   AS total_amount,
       ROUND(AVG(total_amount), 2) AS avg_bill
FROM bill
GROUP BY payment_status;

-- ---------------------------------------------------------------------
-- 5. SUBQUERIES
-- ---------------------------------------------------------------------
SELECT '5. SUBQUERY: bills above the average bill' AS demo_section;
SELECT b.bill_id, p.name AS patient, b.total_amount
FROM bill b
JOIN visit v       ON v.visit_id = b.visit_id
JOIN appointment a ON a.appointment_id = v.appointment_id
JOIN patient p     ON p.patient_id = a.patient_id
WHERE b.total_amount > (SELECT AVG(total_amount) FROM bill)
ORDER BY b.total_amount DESC;

SELECT '5b. SUBQUERY (IN): patients treated by the Pulmonologist' AS demo_section;
SELECT name FROM patient
WHERE patient_id IN (
    SELECT a.patient_id
    FROM appointment a
    JOIN doctor d ON d.doctor_id = a.doctor_id
    WHERE d.specialization = 'Pulmonology' AND a.status = 'completed'
);

SELECT '5c. CORRELATED SUBQUERY: patients with more than one appointment' AS demo_section;
SELECT p.name,
       (SELECT COUNT(*) FROM appointment a WHERE a.patient_id = p.patient_id) AS appointments
FROM patient p
WHERE (SELECT COUNT(*) FROM appointment a WHERE a.patient_id = p.patient_id) > 1;

-- ---------------------------------------------------------------------
-- 6. VIEWS
-- ---------------------------------------------------------------------
SELECT '6. VIEW doctor_revenue_summary (feeds the Admin Analytics page)' AS demo_section;
SELECT * FROM doctor_revenue_summary;

SELECT '6b. VIEW doctor_dashboard_view (feeds the doctor dashboard)' AS demo_section;
SELECT doctor_name, patient_name, appointment_status, diagnosis_code, total_amount, payment_status
FROM doctor_dashboard_view
ORDER BY doctor_name, scheduled_at;

-- ---------------------------------------------------------------------
-- 7. TRIGGERS — audit log (rows created automatically)
-- ---------------------------------------------------------------------
SELECT '7. TRIGGERS: audit_log rows written automatically' AS demo_section;
SELECT audit_id, table_name, record_id, action, old_value, new_value
FROM audit_log
ORDER BY audit_id;

-- Live proof: change a diagnosis, watch trg_visit_update fire, then roll back
SELECT '7b. LIVE TRIGGER: update a diagnosis, audit row appears' AS demo_section;
START TRANSACTION;
UPDATE visit SET diagnosis_code = 'J20' WHERE visit_id = 1;
SELECT audit_id, table_name, record_id, action,
       old_value, new_value
FROM audit_log
WHERE table_name = 'visit' AND record_id = 1
ORDER BY audit_id DESC LIMIT 1;
ROLLBACK;
SELECT diagnosis_code AS diagnosis_after_rollback FROM visit WHERE visit_id = 1;

-- ---------------------------------------------------------------------
-- 8. TRANSACTION + STORED PROCEDURE
--    Record a visit, prescribe, and bill as ONE atomic unit.
--    ROLLBACK at the end shows atomicity: nothing is kept.
-- ---------------------------------------------------------------------
SELECT '8. TRANSACTION + generate_bill() PROCEDURE (rolled back)' AS demo_section;
SELECT COUNT(*) AS visits_before, (SELECT COUNT(*) FROM bill) AS bills_before FROM visit;

START TRANSACTION;

SET @appt := (SELECT appointment_id FROM appointment WHERE status = 'scheduled' ORDER BY scheduled_at LIMIT 1);

INSERT INTO visit (appointment_id, vitals_bp, vitals_temp, vitals_pulse, diagnosis_code)
VALUES (@appt, '120/80', 98.6, 80, 'J45');
SET @visit := LAST_INSERT_ID();

INSERT INTO prescription (visit_id) VALUES (@visit);
SET @rx := LAST_INSERT_ID();

INSERT INTO prescription_item (prescription_id, medicine_id, dosage, frequency, duration_days)
VALUES (@rx, (SELECT medicine_id FROM medicine WHERE name = 'Salbutamol Inhaler'), '2 puffs', '3 times a day', 10);

CALL generate_bill(@visit, 500.00, 0.05);

SELECT bill_id, consultation_fee, medicine_total, tax, total_amount, payment_status
FROM bill WHERE visit_id = @visit;

ROLLBACK;

SELECT COUNT(*) AS visits_after_rollback, (SELECT COUNT(*) FROM bill) AS bills_after_rollback FROM visit;

-- ---------------------------------------------------------------------
-- 9. INDEXES
-- ---------------------------------------------------------------------
SELECT '9. INDEXES on appointment' AS demo_section;
SHOW INDEX FROM appointment;

SELECT '9b. EXPLAIN: lookup by diagnosis_code uses idx_visit_diagnosis_code' AS demo_section;
EXPLAIN SELECT visit_id FROM visit WHERE diagnosis_code = 'J45';

-- ---------------------------------------------------------------------
-- 10. SECURITY — passwords are stored hashed, never in plaintext
-- ---------------------------------------------------------------------
SELECT '10. SECURITY: bcrypt hashes only (no plaintext passwords)' AS demo_section;
SELECT u.email, r.role_name, LEFT(u.password_hash, 7) AS hash_prefix, LENGTH(u.password_hash) AS hash_length
FROM app_user u JOIN role r ON r.role_id = u.role_id;
