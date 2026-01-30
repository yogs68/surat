import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieName, verifySession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies(); // ✅ cookies() is Promise
  const token = cookieStore.get(cookieName())?.value ?? null;

  const sess = verifySession(token);
  if (!sess) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user: {
      id: sess.userId,
      role: sess.role,
      name: sess.name,
      email: sess.email,
    },
  });
}
