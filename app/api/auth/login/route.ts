import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signSession, cookieName } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = (body.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email & password wajib" }, { status: 400 });
  }

  // DEMO: password disimpan plain di db (jangan untuk produksi)
  const [rows] = await pool.query<any[]>(
    `SELECT id, email, name, role, password_hash FROM users WHERE LOWER(email)=? LIMIT 1`,
    [email]
  );
  const u = rows?.[0];
  if (!u) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 401 });

  if (String(u.password_hash) !== password) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const token = signSession({
    userId: Number(u.id),
    role: String(u.role),
    name: String(u.name ?? "User"),
    email: String(u.email),
  });

  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}
