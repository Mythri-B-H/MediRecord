import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/mysql";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const rows = await query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, r.role_name
       FROM app_user u
       JOIN role r ON r.role_id = u.role_id
       WHERE u.email = ?`,
      [email]
    );

    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      userId: user.user_id,
      name: user.name,
      role: user.role_name,
    });

    const res = NextResponse.json({
      user: { id: user.user_id, name: user.name, role: user.role_name },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  // Logout: clear the cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
