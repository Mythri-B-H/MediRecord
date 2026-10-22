import { NextResponse } from "next/server";
import pool, { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/appointments — list appointments.
// Doctor sees only their own; Admin/Receptionist see all.
export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sql = `
    SELECT a.appointment_id, a.scheduled_at, a.status,
           p.patient_id, p.name AS patient_name,
           d.doctor_id, du.name AS doctor_name
    FROM appointment a
    JOIN patient p ON p.patient_id = a.patient_id
    JOIN doctor d ON d.doctor_id = a.doctor_id
    JOIN app_user du ON du.user_id = d.user_id
  `;
  const params = [];

  if (session.role === "Doctor") {
    sql += ` WHERE d.user_id = ?`;
    params.push(session.userId);
  }
  sql += ` ORDER BY a.scheduled_at DESC`;

  const rows = await query(sql, params);
  return NextResponse.json({ appointments: rows });
}

// POST /api/appointments — book an appointment (Receptionist, Admin).
// Demonstrates a TRANSACTION: the appointment insert is wrapped so a
// partial failure never leaves an inconsistent row behind.
export async function POST(req) {
  const session = requireRole(req, ["Receptionist", "Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { patient_id, doctor_id, scheduled_at } = await req.json();
  if (!patient_id || !doctor_id || !scheduled_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO appointment (patient_id, doctor_id, scheduled_at, status, created_by)
       VALUES (?, ?, ?, 'scheduled', ?)`,
      [patient_id, doctor_id, scheduled_at, session.userId]
    );

    await conn.commit();
    return NextResponse.json(
      { appointment_id: result.insertId, message: "Appointment booked" },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("Book appointment error:", err);
    return NextResponse.json({ error: "Could not book appointment" }, { status: 400 });
  } finally {
    conn.release();
  }
}
