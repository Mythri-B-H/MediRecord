import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { getClinicalNotesCollection } from "@/lib/mongodb";
import { requireRole } from "@/lib/auth";

// GET /api/visits?appointment_id=... — a visit (MySQL) + its MongoDB notes + prescription + bill
export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointmentId = req.nextUrl.searchParams.get("appointment_id");
  if (!appointmentId) {
    return NextResponse.json({ error: "appointment_id is required" }, { status: 400 });
  }

  const rows = await query(`SELECT * FROM visit WHERE appointment_id = ?`, [appointmentId]);
  const visit = rows[0];
  if (!visit) return NextResponse.json({ visit: null, notes: null });

  // Free-text note + symptom tags live in MongoDB. If MongoDB is unreachable we
  // still return the SQL part of the visit and flag the problem.
  let notes = null;
  let notes_error = null;
  try {
    const notesCol = await getClinicalNotesCollection();
    notes = await notesCol.findOne({ visit_id: visit.visit_id });
  } catch (err) {
    console.error("MongoDB read error:", err);
    notes_error = "Clinical notes are unavailable (MongoDB not reachable).";
  }

  // Prescription items and bill are plain SQL
  const prescription_items = await query(
    `SELECT m.name AS medicine_name, pi.dosage, pi.frequency, pi.duration_days
     FROM prescription p
     JOIN prescription_item pi ON pi.prescription_id = p.prescription_id
     JOIN medicine m ON m.medicine_id = pi.medicine_id
     WHERE p.visit_id = ?
     ORDER BY pi.prescription_item_id`,
    [visit.visit_id]
  );
  const [bill] = await query(
    `SELECT consultation_fee, medicine_total, tax, total_amount, payment_status
     FROM bill WHERE visit_id = ?`,
    [visit.visit_id]
  );

  return NextResponse.json({ visit, notes, notes_error, prescription_items, bill: bill || null });
}

// POST /api/visits — record a visit (Doctor only).
// Structured vitals/diagnosis go to MySQL; the free-text note and
// symptom tags go to MongoDB. The MySQL row stores mongo_note_id so
// the two can be joined at read time.
export async function POST(req) {
  const session = requireRole(req, ["Doctor"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    appointment_id,
    vitals_bp,
    vitals_temp,
    vitals_pulse,
    diagnosis_code,
    symptoms, // array of strings
    notes, // free text
  } = await req.json();

  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id is required" }, { status: 400 });
  }

  // 1. Insert the structured visit row first (without mongo_note_id yet).
  const result = await query(
    `INSERT INTO visit (appointment_id, vitals_bp, vitals_temp, vitals_pulse, diagnosis_code)
     VALUES (?, ?, ?, ?, ?)`,
    [appointment_id, vitals_bp || null, vitals_temp || null, vitals_pulse || null, diagnosis_code || null]
  );
  const visitId = result.insertId;

  // 2. Fetch doctor_id/patient_id for the clinical_notes document.
  const [appt] = await query(
    `SELECT a.patient_id, d.doctor_id
     FROM appointment a JOIN doctor d ON d.doctor_id = a.doctor_id
     WHERE a.appointment_id = ?`,
    [appointment_id]
  );

  // 3. Insert the clinical note document into MongoDB.
  const notesCol = await getClinicalNotesCollection();
  const mongoResult = await notesCol.insertOne({
    visit_id: visitId,
    patient_id: appt?.patient_id ?? null,
    doctor_id: appt?.doctor_id ?? null,
    diagnosis_code: diagnosis_code || null,
    symptoms: Array.isArray(symptoms) ? symptoms : [],
    notes: notes || "",
    created_at: new Date(),
  });

  // 4. Store the Mongo document id back on the MySQL row (app-level join key).
  await query(`UPDATE visit SET mongo_note_id = ? WHERE visit_id = ?`, [
    mongoResult.insertedId.toString(),
    visitId,
  ]);

  // Mark the appointment completed.
  await query(`UPDATE appointment SET status = 'completed' WHERE appointment_id = ?`, [
    appointment_id,
  ]);

  return NextResponse.json(
    { visit_id: visitId, mongo_note_id: mongoResult.insertedId.toString() },
    { status: 201 }
  );
}
