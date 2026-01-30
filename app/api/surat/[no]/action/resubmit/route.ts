import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { cookieName, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ ok: false, error: "judul, bidang, ringkasan wajib" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = (await conn.query(
      `SELECT id, status, revisi_step FROM surat WHERE no=? LIMIT 1`,
      [decodedNo]
    )) as any[];
    const surat = rows?.[0];
    if (!surat) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (String(surat.status) !== "REVISI") {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Surat tidak dalam status REVISI" }, { status: 400 });
    }

    const revStep = Number(surat.revisi_step);
    if (!revStep || Number.isNaN(revStep)) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "revisi_step kosong" }, { status: 400 });
    }

    // Update isi surat
    await conn.query(
      `UPDATE surat SET judul=?, bidang=?, ringkasan=?, status='MENUNGGU_APPROVAL' WHERE no=?`,
      [judul, bidang, ringkasan, decodedNo]
    );

    // Reset step yang meminta revisi jadi MENUNGGU lagi (supaya dia yang aktif)
    await conn.query(
      `UPDATE approval_steps SET status='MENUNGGU' WHERE no=? AND step=?`,
      [decodedNo, revStep]
    );

    // Optional: step setelahnya tetap MENUNGGU (ga diubah). Step sebelumnya sudah DISETUJUI tetap.
    // Clear revisi_step
    await conn.query(`UPDATE surat SET revisi_step=NULL WHERE no=?`, [decodedNo]);

    // Audit
    await conn.query(
      `INSERT INTO audit_logs (surat_id, actor_id, action, meta) VALUES (?, ?, 'RESUBMIT', ?)`,
      [surat.id, sess.userId, JSON.stringify({ no: decodedNo, step: revStep })]
    );

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await conn.rollback();
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
