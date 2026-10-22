import { NextResponse } from "next/server";
import pool, { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// POST /api/billing — generate a bill for a visit by calling the
// generate_bill() stored procedure (one of the project's required
// advanced DB features).
export async function POST(req) {
  const session = requireRole(req, ["Receptionist", "Admin", "Doctor"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visit_id, consultation_fee = 300, tax_rate = 0.05 } = await req.json();
  if (!visit_id) return NextResponse.json({ error: "visit_id is required" }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.query(`CALL generate_bill(?, ?, ?)`, [visit_id, consultation_fee, tax_rate]);
    const [rows] = await conn.query(`SELECT * FROM bill WHERE visit_id = ?`, [visit_id]);
    return NextResponse.json({ bill: rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Generate bill error:", err);
    return NextResponse.json({ error: "Could not generate bill" }, { status: 400 });
  } finally {
    conn.release();
  }
}

// GET /api/billing — list bills with payment status (Receptionist/Admin)
export async function GET(req) {
  const session = requireRole(req, ["Receptionist", "Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ?unbilled=1 -> completed visits that don't have a bill yet (for the "Generate bill" form)
  if (new URL(req.url).searchParams.get("unbilled")) {
    const visits = await query(
      `SELECT v.visit_id, p.name AS patient_name, u.name AS doctor_name, a.scheduled_at
       FROM visit v
       JOIN appointment a ON a.appointment_id = v.appointment_id
       JOIN patient p ON p.patient_id = a.patient_id
       JOIN doctor d ON d.doctor_id = a.doctor_id
       JOIN app_user u ON u.user_id = d.user_id
       LEFT JOIN bill b ON b.visit_id = v.visit_id
       WHERE b.bill_id IS NULL
       ORDER BY a.scheduled_at DESC`
    );
    return NextResponse.json({ visits });
  }

  const rows = await query(
    `SELECT b.*, p.name AS patient_name
     FROM bill b
     JOIN visit v ON v.visit_id = b.visit_id
     JOIN appointment a ON a.appointment_id = v.appointment_id
     JOIN patient p ON p.patient_id = a.patient_id
     ORDER BY b.generated_at DESC`
  );
  return NextResponse.json({ bills: rows });
}

// PATCH /api/billing — update a bill's payment status (Receptionist/Admin)
export async function PATCH(req) {
  const session = requireRole(req, ["Receptionist", "Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bill_id, payment_status } = await req.json();
  if (!bill_id || !["pending", "paid", "refunded"].includes(payment_status)) {
    return NextResponse.json({ error: "bill_id and a valid payment_status are required" }, { status: 400 });
  }
  await query(`UPDATE bill SET payment_status = ? WHERE bill_id = ?`, [payment_status, bill_id]);
  return NextResponse.json({ ok: true });
}
