import { NextResponse } from "next/server";
import { getClinicalNotesCollection } from "@/lib/mongodb";
import { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/symptom-search?q=chest+tightness+wheezing
// Doctor-only. Runs a MongoDB $text search over clinical notes +
// symptom tags, then joins the matching visit_ids back to MySQL to
// pull each case's diagnosis and prescription history (FR6).
export async function GET(req) {
  const session = requireRole(req, ["Doctor"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q (search query) is required" }, { status: 400 });

  const notesCol = await getClinicalNotesCollection();

  const matches = await notesCol
    .find(
      { $text: { $search: q } },
      { projection: { score: { $meta: "textScore" } } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(10)
    .toArray();

  if (matches.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const visitIds = matches.map((m) => m.visit_id);
  const placeholders = visitIds.map(() => "?").join(",");

  const visits = await query(
    `SELECT v.visit_id, v.diagnosis_code, v.vitals_bp, v.vitals_temp, v.vitals_pulse,
            p.name AS patient_name, du.name AS doctor_name, a.scheduled_at
     FROM visit v
     JOIN appointment a ON a.appointment_id = v.appointment_id
     JOIN patient p ON p.patient_id = a.patient_id
     JOIN doctor d ON d.doctor_id = a.doctor_id
     JOIN app_user du ON du.user_id = d.user_id
     WHERE v.visit_id IN (${placeholders})`,
    visitIds
  );

  const visitById = Object.fromEntries(visits.map((v) => [v.visit_id, v]));

  const results = matches.map((m) => ({
    visit_id: m.visit_id,
    symptoms: m.symptoms,
    notes: m.notes,
    score: m.score,
    sql_record: visitById[m.visit_id] || null,
  }));

  return NextResponse.json({ results });
}
