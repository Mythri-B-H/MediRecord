import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/auth/me — used by client pages to check who's logged in.
export async function GET(req) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
