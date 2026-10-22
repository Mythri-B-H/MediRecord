-- =====================================================================
-- MediRecord — DATA INTEGRITY DEMO (every statement below is EXPECTED TO FAIL)
--
-- Shows the database rejecting bad data: CHECK, UNIQUE, FOREIGN KEY, RESTRICT.
-- Run with --force so mysql keeps going after each expected error:
--
--   mysql -u root -p --force medirecord < sql/demo_integrity_errors.sql
--
-- Or paste the statements one at a time and screenshot each error.
-- Nothing here changes the data (every statement is rejected).
-- =====================================================================
USE medirecord;

-- 1. CHECK constraint: gender must be Male / Female / Other
SELECT '1. CHECK: invalid gender' AS expected_to_fail;
INSERT INTO patient (name, dob, gender, phone) VALUES ('Bad Gender', '2000-01-01', 'Unknown', '9000000001');

-- 2. CHECK constraint: price cannot be negative
SELECT '2. CHECK: negative medicine price' AS expected_to_fail;
INSERT INTO medicine (name, form, unit_price, stock_qty) VALUES ('Bad Price', 'tablet', -5, 10);

-- 3. UNIQUE constraint: email already registered
SELECT '3. UNIQUE: duplicate login email' AS expected_to_fail;
INSERT INTO app_user (name, email, password_hash, role_id)
VALUES ('Duplicate', 'admin@medirecord.com', 'x', 1);

-- 4. UNIQUE constraint: one bill per visit
SELECT '4. UNIQUE: second bill for the same visit' AS expected_to_fail;
CALL generate_bill(1, 300, 0.05);

-- 5. FOREIGN KEY: appointment for a patient that does not exist
SELECT '5. FOREIGN KEY: appointment for non-existent patient' AS expected_to_fail;
INSERT INTO appointment (patient_id, doctor_id, scheduled_at, status, created_by)
VALUES (9999, 1, NOW(), 'scheduled', 1);

-- 6. FOREIGN KEY ... ON DELETE RESTRICT: cannot delete a patient who has appointments
SELECT '6. RESTRICT: delete a patient with appointments' AS expected_to_fail;
DELETE FROM patient WHERE name = 'Ravi Kumar';

-- 7. CHECK constraint: invalid appointment status
SELECT '7. CHECK: invalid appointment status' AS expected_to_fail;
UPDATE appointment SET status = 'maybe' WHERE appointment_id = 9;

SELECT 'Done. Every statement above was rejected; data unchanged.' AS result;
