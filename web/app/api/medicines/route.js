import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function GET(req) {
  const session = requireRole(req, ["Admin", "Doctor", "Receptionist"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT medicine_id, name, form, unit_price, stock_qty FROM medicine ORDER BY name`
  );
  return NextResponse.json({ medicines: rows });
}
