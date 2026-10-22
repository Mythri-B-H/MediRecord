import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/doctors — list all doctors (any authenticated role)
export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT d.doctor_id, u.name, u.email, d.specialization, d.license_no, d.years_experience
     FROM doctor d JOIN app_user u ON u.user_id = d.user_id
     ORDER BY u.name`
  );
  return NextResponse.json({ doctors: rows });
}

// POST /api/doctors — create a new doctor account (Admin only)
export async function POST(req) {
  const session = requireRole(req, ["Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, password, specialization, license_no, years_experience } =
    await req.json();

  if (!name || !email || !password || !specialization || !license_no) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [doctorRole] = await query(
    `SELECT role_id FROM role WHERE role_name = 'Doctor'`
  );
  if (!doctorRole) {
    return NextResponse.json({ error: "Doctor role not seeded" }, { status: 500 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  // Transaction: create the app_user row and the doctor row together —
  // if the doctor insert fails (e.g. duplicate license_no), roll back
  // the user insert too, so we never leave an orphaned login account.
  const pool = (await import("@/lib/mysql")).default;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.execute(
      `INSERT INTO app_user (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)`,
      [name, email, password_hash, doctorRole.role_id]
    );

    const [doctorResult] = await conn.execute(
      `INSERT INTO doctor (user_id, specialization, license_no, years_experience)
       VALUES (?, ?, ?, ?)`,
      [userResult.insertId, specialization, license_no, years_experience || 0]
    );

    await conn.commit();
    return NextResponse.json(
      { doctor_id: doctorResult.insertId, message: "Doctor account created" },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("Create doctor error:", err);
    const message = err.code === "ER_DUP_ENTRY" ? "Email or license already in use" : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    conn.release();
  }
}
