// One-command demo data loader for MediRecord.
//
//   node scripts/seed-demo.js
//
// RESETS the demo data (users, doctors, patients, appointments, visits,
// prescriptions, bills, audit log, medicines, Mongo clinical notes) and then
// loads a realistic, consistent data set through the SAME paths the app uses:
//   - bcrypt-hashed passwords
//   - visits  -> MySQL row + MongoDB clinical note, linked by visit_id / mongo_note_id
//   - prescriptions -> fire the audit triggers
//   - bills   -> created by the generate_bill() stored procedure
//
// Requires: MySQL schema + advanced features applied (sql/*.sql) and .env.local.
// Safe to run any number of times.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const bcrypt = require("bcryptjs");

const PASSWORDS = {
  admin: "rkb@123",
  reception: "password123",
  doctor: "doctor@123",
};

const MEDICINES = [
  ["Paracetamol 500mg", "tablet", 2.0, 500],
  ["Amoxicillin 500mg", "tablet", 12.0, 300],
  ["Cetirizine 10mg", "tablet", 3.5, 400],
  ["Salbutamol Inhaler", "other", 95.0, 120],
  ["Cough Syrup (Benadryl)", "syrup", 85.0, 150],
  ["Pantoprazole 40mg", "tablet", 8.0, 250],
  ["Ibuprofen 400mg", "tablet", 4.0, 350],
  ["Azithromycin 500mg", "tablet", 30.0, 200],
  ["Amlodipine 5mg", "tablet", 6.0, 300],
  ["Sumatriptan 50mg", "tablet", 25.0, 100],
  ["Montelukast 10mg", "tablet", 14.0, 200],
  ["Domperidone 10mg", "tablet", 3.0, 250],
];

const DOCTORS = [
  { key: "priya", name: "Priya Sharma", email: "priya.sharma@medirecord.com", spec: "General Medicine", license: "KA98765", years: 8, fee: 300 },
  { key: "arvind", name: "Arvind Rao", email: "arvind.rao@medirecord.com", spec: "Pulmonology", license: "KA55120", years: 14, fee: 500 },
];

const PATIENTS = [
  ["Ravi Kumar", "1990-04-12", "Male", "9876543210", "Chennai", "O+"],
  ["Sneha Rao", "1985-09-23", "Female", "9845012345", "Bangalore", "B+"],
  ["Karthik Nair", "1978-01-30", "Male", "9741098765", "Mysore", "A+"],
  ["Anita Desai", "1996-06-18", "Female", "9822011223", "Pune", "AB+"],
  ["Mohammed Faiz", "1982-11-02", "Male", "9900112233", "Hyderabad", "O-"],
  ["Lakshmi Iyer", "1965-03-27", "Female", "9444055667", "Coimbatore", "B-"],
  ["Rohan Gupta", "2001-08-09", "Male", "9810099887", "Delhi", "A+"],
  ["Divya Menon", "1993-12-15", "Female", "9605566778", "Kochi", "O+"],
];

// Completed visits (days ago, patient, doctor, vitals, dx, symptoms, notes, [medicine, dosage, frequency, days], paid?)
const VISITS = [
  { daysAgo: 9, patient: "Ravi Kumar", doctor: "arvind", bp: "128/82", temp: 98.4, pulse: 88, dx: "J45",
    symptoms: ["chest tightness", "wheezing", "shortness of breath"],
    notes: "Patient reports wheezing at night and chest tightness on exertion. Known asthma since childhood. Reduced peak flow. Advised to avoid dust exposure.",
    rx: [["Salbutamol Inhaler", "2 puffs", "4 times a day", 14], ["Montelukast 10mg", "1 tablet", "once at night", 14]], paid: true },
  { daysAgo: 8, patient: "Sneha Rao", doctor: "arvind", bp: "118/76", temp: 98.6, pulse: 82, dx: "J45",
    symptoms: ["wheezing", "dry cough", "chest tightness"],
    notes: "Dry cough with wheezing after exercise, worse in cold weather. Mild bronchospasm on auscultation. Suspected exercise-induced asthma.",
    rx: [["Salbutamol Inhaler", "2 puffs", "as needed", 10], ["Cetirizine 10mg", "1 tablet", "once a day", 7]], paid: true },
  { daysAgo: 7, patient: "Karthik Nair", doctor: "priya", bp: "122/80", temp: 101.2, pulse: 96, dx: "J06",
    symptoms: ["fever", "sore throat", "headache"],
    notes: "Viral upper respiratory infection. Fever for two days with sore throat and body ache. Advised rest and fluids.",
    rx: [["Paracetamol 500mg", "1 tablet", "3 times a day", 3]], paid: true },
  { daysAgo: 6, patient: "Anita Desai", doctor: "priya", bp: "110/70", temp: 98.2, pulse: 78, dx: "K29",
    symptoms: ["abdominal pain", "nausea", "acidity"],
    notes: "Epigastric burning pain after meals with nausea. Suspected gastritis. Advised to avoid spicy food and late meals.",
    rx: [["Pantoprazole 40mg", "1 tablet", "before breakfast", 14], ["Domperidone 10mg", "1 tablet", "twice a day", 5]], paid: false },
  { daysAgo: 5, patient: "Mohammed Faiz", doctor: "arvind", bp: "136/88", temp: 98.8, pulse: 92, dx: "J45", dxCorrectedTo: "J44",
    symptoms: ["shortness of breath", "chronic cough", "wheezing"],
    notes: "Long-term smoker with chronic productive cough and breathlessness on climbing stairs. Expiratory wheeze on auscultation. Diagnosis revised to COPD.",
    rx: [["Salbutamol Inhaler", "2 puffs", "3 times a day", 30], ["Azithromycin 500mg", "1 tablet", "once a day", 5]], paid: false },
  { daysAgo: 4, patient: "Lakshmi Iyer", doctor: "priya", bp: "160/100", temp: 98.4, pulse: 84, dx: "I10",
    symptoms: ["headache", "dizziness", "blurred vision"],
    notes: "Elevated blood pressure with headache and dizziness for a week. Family history of hypertension. Started on antihypertensive.",
    rx: [["Amlodipine 5mg", "1 tablet", "once a day", 30]], paid: true },
  { daysAgo: 3, patient: "Rohan Gupta", doctor: "priya", bp: "120/78", temp: 100.4, pulse: 90, dx: "J06",
    symptoms: ["fever", "cough", "sore throat"],
    notes: "Fever with cough and sore throat for three days. Throat congestion, no breathlessness. Viral infection likely.",
    rx: [["Paracetamol 500mg", "1 tablet", "3 times a day", 3], ["Cough Syrup (Benadryl)", "10 ml", "3 times a day", 5]], paid: false },
  { daysAgo: 2, patient: "Divya Menon", doctor: "priya", bp: "112/72", temp: 98.0, pulse: 74, dx: "G43",
    symptoms: ["headache", "nausea", "sensitivity to light"],
    notes: "Recurrent throbbing headache with nausea and photophobia, lasting several hours. Consistent with migraine.",
    rx: [["Sumatriptan 50mg", "1 tablet", "at onset of headache", 5], ["Domperidone 10mg", "1 tablet", "as needed", 5]], paid: true },
];

// Upcoming appointments, left 'scheduled' so the Doctor can record them live in the demo
const UPCOMING = [
  { hoursAhead: 20, patient: "Ravi Kumar", doctor: "arvind" },
  { hoursAhead: 24, patient: "Karthik Nair", doctor: "priya" },
  { hoursAhead: 44, patient: "Anita Desai", doctor: "priya" },
];

async function seed({ conn, notesCol, log = console.log }) {
  // ---- 0. Reset (roles are kept) ----
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of ["bill", "prescription_item", "prescription", "visit", "appointment", "patient", "doctor", "medicine", "audit_log", "app_user"]) {
    await conn.query(`TRUNCATE TABLE ${t}`);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  await notesCol.deleteMany({});

  const [roleRows] = await conn.query("SELECT role_id, role_name FROM role");
  const roleId = Object.fromEntries(roleRows.map((r) => [r.role_name, r.role_id]));
  for (const r of ["Admin", "Doctor", "Receptionist"]) {
    if (!roleId[r]) throw new Error(`Role "${r}" missing. Run sql/ddl_schema_mysql.sql first.`);
  }

  // ---- 1. Users ----
  const addUser = async (name, email, password, role) => {
    const hash = await bcrypt.hash(password, 10);
    const [res] = await conn.execute(
      "INSERT INTO app_user (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
      [name, email, hash, roleId[role]]
    );
    return res.insertId;
  };
  await addUser("Admin", "admin@medirecord.com", PASSWORDS.admin, "Admin");
  const receptionUserId = await addUser("Reception Desk", "reception@medirecord.com", PASSWORDS.reception, "Receptionist");

  const doctorId = {};
  const doctorFee = {};
  for (const d of DOCTORS) {
    const userId = await addUser(d.name, d.email, PASSWORDS.doctor, "Doctor");
    const [res] = await conn.execute(
      "INSERT INTO doctor (user_id, specialization, license_no, years_experience) VALUES (?, ?, ?, ?)",
      [userId, d.spec, d.license, d.years]
    );
    doctorId[d.key] = res.insertId;
    doctorFee[d.key] = d.fee;
  }

  // ---- 2. Medicines + patients ----
  const medicineId = {};
  for (const [name, form, price, stock] of MEDICINES) {
    const [res] = await conn.execute(
      "INSERT INTO medicine (name, form, unit_price, stock_qty) VALUES (?, ?, ?, ?)",
      [name, form, price, stock]
    );
    medicineId[name] = res.insertId;
  }
  const patientId = {};
  for (const [name, dob, gender, phone, address, blood] of PATIENTS) {
    const [res] = await conn.execute(
      "INSERT INTO patient (name, dob, gender, phone, address, blood_group) VALUES (?, ?, ?, ?, ?, ?)",
      [name, dob, gender, phone, address, blood]
    );
    patientId[name] = res.insertId;
  }

  // ---- 3. NoSQL collection + indexes (idempotent; mirrors mongodb/mongodb_setup.js) ----
  await notesCol.createIndex({ notes: "text", symptoms: "text" }, { name: "idx_notes_text_search" });
  await notesCol.createIndex({ visit_id: 1 }, { unique: true });
  await notesCol.createIndex({ doctor_id: 1 });
  await notesCol.createIndex({ diagnosis_code: 1 });

  // ---- 4. Completed visits: appointment -> visit (MySQL) -> note (MongoDB) -> Rx -> bill ----
  let billsPaid = 0;
  for (const v of VISITS) {
    const [ap] = await conn.execute(
      "INSERT INTO appointment (patient_id, doctor_id, scheduled_at, status, created_by) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'completed', ?)",
      [patientId[v.patient], doctorId[v.doctor], v.daysAgo, receptionUserId]
    );
    const [vr] = await conn.execute(
      "INSERT INTO visit (appointment_id, vitals_bp, vitals_temp, vitals_pulse, diagnosis_code) VALUES (?, ?, ?, ?, ?)",
      [ap.insertId, v.bp, v.temp, v.pulse, v.dx]
    );
    const visitId = vr.insertId;

    let finalDx = v.dx;
    if (v.dxCorrectedTo) {
      // Diagnosis correction -> fires trg_visit_update (audit_log UPDATE row)
      await conn.execute("UPDATE visit SET diagnosis_code = ? WHERE visit_id = ?", [v.dxCorrectedTo, visitId]);
      finalDx = v.dxCorrectedTo;
    }

    const note = await notesCol.insertOne({
      visit_id: visitId,
      patient_id: patientId[v.patient],
      doctor_id: doctorId[v.doctor],
      diagnosis_code: finalDx,
      symptoms: v.symptoms,
      notes: v.notes,
      created_at: new Date(),
    });
    await conn.execute("UPDATE visit SET mongo_note_id = ? WHERE visit_id = ?", [note.insertedId.toString(), visitId]);

    // Prescription (header + items) -> fires trg_prescription_insert
    const [rx] = await conn.execute("INSERT INTO prescription (visit_id) VALUES (?)", [visitId]);
    for (const [med, dosage, frequency, days] of v.rx) {
      await conn.execute(
        "INSERT INTO prescription_item (prescription_id, medicine_id, dosage, frequency, duration_days) VALUES (?, ?, ?, ?, ?)",
        [rx.insertId, medicineId[med], dosage, frequency, days]
      );
    }

    // Bill via the stored procedure
    await conn.query("CALL generate_bill(?, ?, ?)", [visitId, doctorFee[v.doctor], 0.05]);
    if (v.paid) {
      await conn.execute("UPDATE bill SET payment_status = 'paid' WHERE visit_id = ?", [visitId]);
      billsPaid++;
    }
  }

  // ---- 5. Upcoming appointments (for live demo) ----
  for (const u of UPCOMING) {
    await conn.execute(
      "INSERT INTO appointment (patient_id, doctor_id, scheduled_at, status, created_by) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 'scheduled', ?)",
      [patientId[u.patient], doctorId[u.doctor], u.hoursAhead, receptionUserId]
    );
  }

  const count = async (t) => (await conn.query(`SELECT COUNT(*) AS n FROM ${t}`))[0][0].n;
  const summary = {
    users: await count("app_user"),
    doctors: await count("doctor"),
    patients: await count("patient"),
    medicines: await count("medicine"),
    appointments: await count("appointment"),
    visits: await count("visit"),
    prescriptions: await count("prescription"),
    bills: await count("bill"),
    bills_paid: billsPaid,
    audit_log_rows: await count("audit_log"),
  };
  log("\nDemo data loaded:");
  for (const [k, n] of Object.entries(summary)) log(`  ${k.padEnd(15)} ${n}`);
  log("\nLogins:");
  log(`  Admin         admin@medirecord.com           ${PASSWORDS.admin}`);
  log(`  Receptionist  reception@medirecord.com       ${PASSWORDS.reception}`);
  for (const d of DOCTORS) log(`  Doctor        ${d.email.padEnd(30)} ${PASSWORDS.doctor}   (${d.spec})`);
  return summary;
}

module.exports = { seed };

if (require.main === module) {
  (async () => {
    const mysql = require("mysql2/promise");
    const { MongoClient } = require("mongodb");

    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    try {
      await mongo.connect();
    } catch {
      await conn.end();
      throw new Error(
        `Could not connect to MongoDB at ${process.env.MONGODB_URI}. ` +
          "Make sure the MongoDB service is running (Windows: Services -> MongoDB Server -> Start). Nothing was changed."
      );
    }
    const notesCol = mongo.db(process.env.MONGODB_DB || "medirecord").collection("clinical_notes");

    try {
      await seed({ conn, notesCol });
    } finally {
      await conn.end();
      await mongo.close();
    }
  })().catch((err) => {
    console.error("\nSeed failed:", err.message);
    process.exit(1);
  });
}
