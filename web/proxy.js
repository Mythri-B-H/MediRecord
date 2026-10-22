import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const ROLE_HOME = {
  Admin: "/admin",
  Doctor: "/doctor",
  Receptionist: "/receptionist",
};

// Protects the three role-based sections of the app. Each API route
// also re-checks the role server-side via requireRole(), so this file
// is a UX convenience (fast redirect to the right dashboard / to
// login), not the only line of defense — see Data Security guidance.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("medirecord_token")?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const home = ROLE_HOME[session.role];
  if (!home || !pathname.startsWith(home)) {
    const url = request.nextUrl.clone();
    url.pathname = home || "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/receptionist/:path*"],
};
