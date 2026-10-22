import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/analytics — Admin dashboard data, pulled from the
// doctor_revenue_summary VIEW (one of the required advanced DB features).
export async function GET(req) {
  const session = requireRole(req, ["Admin"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const revenue = await query(`SELECT * FROM doctor_revenue_summary ORDER BY total_revenue DESC`);
  const [{ total_patients } = {}] = await query(`SELECT COUNT(*) AS total_patients FROM patient`);
  const [{ total_appointments } = {}] = await query(`SELECT COUNT(*) AS total_appointments FROM appointment`);
  const [{ total_doctors } = {}] = await query(`SELECT COUNT(*) AS total_doctors FROM doctor`);

  return NextResponse.json({
    revenue,
    totals: { total_patients, total_appointments, total_doctors },
  });
}
