import { NextResponse } from "next/server";
import pool, { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// POST /api/prescriptions — create a prescription with one or more
// medicine items for a visit (Doctor only). Runs as a transaction
// since prescription + prescription_item rows must stay consistent.
export async function POST(req) {
  const session = requireRole(req, ["Doctor"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { visit_id, items } = await req.json();
  // items: [{ medicine_id, dosage, frequency, duration_days }, ...]

  if (!visit_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "visit_id and at least one item are required" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [presResult] = await conn.execute(
      `INSERT INTO prescription (visit_id) VALUES (?)`,
      [visit_id]
    );
    const prescriptionId = presResult.insertId;

    for (const item of items) {
      await conn.execute(
        `INSERT INTO prescription_item (prescription_id, medicine_id, dosage, frequency, duration_days)
         VALUES (?, ?, ?, ?, ?)`,
        [prescriptionId, item.medicine_id, item.dosage, item.frequency, item.duration_days]
      );
    }

    await conn.commit();
    return NextResponse.json(
      { prescription_id: prescriptionId, message: "Prescription created" },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("Create prescription error:", err);
    return NextResponse.json({ error: "Could not create prescription" }, { status: 400 });
  } finally {
    conn.release();
  }
}

// GET /api/prescriptions?visit_id=... — fetch a visit's prescription + items
export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visitId = req.nextUrl.searchParams.get("visit_id");
  if (!visitId) return NextResponse.json({ error: "visit_id is required" }, { status: 400 });

  const [prescription] = await query(`SELECT * FROM prescription WHERE visit_id = ?`, [visitId]);
  if (!prescription) return NextResponse.json({ prescription: null, items: [] });

  const items = await query(
    `SELECT pi.*, m.name AS medicine_name, m.unit_price
     FROM prescription_item pi JOIN medicine m ON m.medicine_id = pi.medicine_id
     WHERE pi.prescription_id = ?`,
    [prescription.prescription_id]
  );

  return NextResponse.json({ prescription, items });
}
