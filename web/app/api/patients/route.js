import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/patients — list all patients (Admin, Doctor, Receptionist)
export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT patient_id, name, dob, gender, phone, address, blood_group, created_at
     FROM patient ORDER BY created_at DESC`
  );
  return NextResponse.json({ patients: rows });
}

// POST /api/patients — register a new patient (Receptionist, Admin)
export async function POST(req) {
  const session = requireRole(req, ["Receptionist", "Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, dob, gender, phone, address, blood_group } = await req.json();

  if (!name || !dob || !gender || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await query(
    `INSERT INTO patient (name, dob, gender, phone, address, blood_group)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, dob, gender, phone, address || null, blood_group || null]
  );

  return NextResponse.json(
    { patient_id: result.insertId, message: "Patient registered" },
    { status: 201 }
  );
}
