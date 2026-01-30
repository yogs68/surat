import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { cookieName, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function isBadFieldErr(e: any) {
  return String(e?.code || "").includes("ER_BAD_FIELD_ERROR");
}

async function selectSteps(conn: any, suratId: number, suratNo: string) {
  try {
    const [rows] = await conn.query(
      `
      SELECT step, role, status, note, acted_at
      FROM approval_steps
      WHERE surat_id = ?
      ORDER BY step ASC
      `,
      [suratId]
    );
    return { key: "surat_id" as const, rows: rows as any[] };
  } catch (e: any) {
    if (!isBadFieldErr(e)) throw e;

    const [rows] = await conn.query(
      `
      SELECT step, role, status, note, acted_at
      FROM approval_steps
      WHERE no = ?
      ORDER BY step ASC
      `,
      [suratNo]
    );
    return { key: "no" as const, rows: rows as any[] };
  }
}

async function updateStepToMenunggu(
  conn: any,
  key: "surat_id" | "no",
  suratId: number,
  suratNo: string,
  step: number
) {
  if (key === "surat_id") {
    await conn.query(
      `UPDATE approval_steps SET status='MENUNGGU' WHERE surat_id=? AND step=?`,
      [suratId, step]
    );
  } else {
    await conn.query(
      `UPDATE approval_steps SET status='MENUNGGU' WHERE no=? AND step=?`,
      [suratNo, step]
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ no: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value ?? null;
  const sess = verifySession(token);
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // hanya BIDANG boleh resubmit
  if (String(sess.role).toUpperCase() !== "BIDANG") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { no } = await ctx.params;
  const decodedNo = decodeURIComponent(no);

  let body: { judul?: string; bidang?: string; ringkasan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const judul = (body.judul ?? "").trim();
  const bidang = (body.bidang ?? "").trim();
  const ringkasan = (body.ringkasan ?? "").trim();

  if (!judul || !bidang || !ringkasan) {
    return NextResponse.json(
      { ok: false, error: "judul, bidang, ringkasan wajib" },
      { status: 400 }
    );
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ambil surat
    const [suratRows] = (await conn.query(
      `SELECT id, status FROM surat WHERE no=? LIMIT 1`,
      [decodedNo]
    )) as any[];

    const surat = suratRows?.[0];
    if (!surat) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (String(surat.status) !== "REVISI") {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Surat tidak dalam status REVISI" },
        { status: 400 }
      );
    }

    const suratId = Number(surat.id);

    // cari step yang statusnya REVISI
    const { key, rows: steps } = await selectSteps(conn, suratId, decodedNo);
    const revisiStep = steps.find((s: any) => s.status === "REVISI");

    if (!revisiStep) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Tidak menemukan approval step yang REVISI" },
        { status: 400 }
      );
    }

    const stepNo = Number(revisiStep.step);

    // update isi surat + status
    await conn.query(
      `UPDATE surat SET judul=?, bidang=?, ringkasan=?, status='MENUNGGU_APPROVAL' WHERE no=?`,
      [judul, bidang, ringkasan, decodedNo]
    );

    // step yang REVISI balik jadi MENUNGGU (note tetap disimpan)
    await updateStepToMenunggu(conn, key, suratId, decodedNo, stepNo);

    // audit log (kalau ada tabelnya)
    try {
      await conn.query(
        `INSERT INTO audit_logs (surat_id, actor_id, action, meta) VALUES (?, ?, 'RESUBMIT', ?)`,
        [suratId, sess.userId, JSON.stringify({ no: decodedNo, step: stepNo })]
      );
    } catch {}

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await conn.rollback();
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
