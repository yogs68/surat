import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { cookieName, verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

type ActionType = "approve" | "reject" | "revise";

function toDbRole(role: string) {
  return String(role || "").toUpperCase();
}

function stepOfRole(role: string) {
  const r = toDbRole(role);
  if (r === "WAKETUM") return 1;
  if (r === "SEKJEN") return 2;
  if (r === "BENDUM") return 3;
  if (r === "EKSEKUTOR") return 4;
  return null; // BIDANG / unknown
}

function isBadFieldErr(e: any) {
  // MySQL: ER_BAD_FIELD_ERROR
  return String(e?.code || "").includes("ER_BAD_FIELD_ERROR");
}

// ====== helpers: support schema approval_steps: (surat_id) OR (no) ======
async function selectSteps(conn: any, suratId: number, suratNo: string) {
  try {
    const [rows] = await conn.query(
      `
      SELECT step, role, status
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
      SELECT step, role, status
      FROM approval_steps
      WHERE no = ?
      ORDER BY step ASC
      `,
      [suratNo]
    );
    return { key: "no" as const, rows: rows as any[] };
  }
}

async function updateStep(conn: any, key: "surat_id" | "no", suratId: number, suratNo: string, step: number, status: string, note: string | null) {
  if (key === "surat_id") {
    await conn.query(
      `
      UPDATE approval_steps
      SET status = ?, note = ?, acted_at = NOW()
      WHERE surat_id = ? AND step = ?
      `,
      [status, note, suratId, step]
    );
  } else {
    await conn.query(
      `
      UPDATE approval_steps
      SET status = ?, note = ?, acted_at = NOW()
      WHERE no = ? AND step = ?
      `,
      [status, note, suratNo, step]
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ no: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value ?? null;
  const sess = verifySession(token);
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { no } = await ctx.params;
  const decodedNo = decodeURIComponent(no);

  let body: { type?: ActionType; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type;
  const note = (body.note ?? "").trim();

  if (!type || !["approve", "reject", "revise"].includes(type)) {
    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
  }

  const actorRole = toDbRole(sess.role);
  const actorStep = stepOfRole(actorRole);
  if (!actorStep) {
    return NextResponse.json({ ok: false, error: "Role tidak punya hak approval" }, { status: 403 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ambil surat
    const [suratRows] = (await conn.query(
      `SELECT id, status FROM surat WHERE no = ? LIMIT 1`,
      [decodedNo]
    )) as any[];

    const surat = suratRows?.[0];
    if (!surat) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const suratId = Number(surat.id);

    if (["DITOLAK", "SELESAI"].includes(String(surat.status))) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Surat sudah final" }, { status: 400 });
    }

    // 2) ambil steps (support surat_id atau no)
    const { key, rows: steps } = await selectSteps(conn, suratId, decodedNo);

    if (!steps?.length) {
      await conn.rollback();
      return NextResponse.json({ ok: false, error: "Approval steps belum dibuat" }, { status: 400 });
    }

    // 3) step aktif = first MENUNGGU / REVISI
    const active = steps.find((s: any) => s.status === "MENUNGGU" || s.status === "REVISI");

    if (!active) {
      // semua beres -> selesai
      await conn.query(`UPDATE surat SET status='SELESAI' WHERE no=?`, [decodedNo]);
      await conn.commit();
      return NextResponse.json({ ok: true, message: "Sudah selesai" });
    }

    const activeStep = Number(active.step);
    const activeRole = String(active.role).toUpperCase();

    // 4) cek giliran
    if (activeStep !== actorStep || activeRole !== actorRole) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: `Bukan giliran kamu. Giliran: Step ${activeStep} (${activeRole})` },
        { status: 403 }
      );
    }

    // 5) update step
    const newStepStatus =
      type === "approve" ? "DISETUJUI" : type === "reject" ? "DITOLAK" : "REVISI";

    await updateStep(conn, key, suratId, decodedNo, activeStep, newStepStatus, note || null);

    // 6) update surat status
    if (type === "reject") {
      await conn.query(`UPDATE surat SET status='DITOLAK' WHERE no=?`, [decodedNo]);
    } else if (type === "revise") {
      await conn.query(`UPDATE surat SET status='REVISI' WHERE no=?`, [decodedNo]);
    } else {
      // approve
      if (activeStep === 4) {
        await conn.query(`UPDATE surat SET status='SELESAI' WHERE no=?`, [decodedNo]);
      } else {
        await conn.query(`UPDATE surat SET status='MENUNGGU_APPROVAL' WHERE no=?`, [decodedNo]);
      }
    }

    // 7) audit log (kalau tabel audit_logs belum ada, jangan bikin crash)
    try {
      await conn.query(
        `INSERT INTO audit_logs (surat_id, actor_id, action, meta) VALUES (?, ?, ?, ?)`,
        [
          suratId,
          sess.userId,
          type === "approve" ? "APPROVE" : type === "reject" ? "REJECT" : "REVISE",
          JSON.stringify({ no: decodedNo, step: activeStep, role: actorRole, note: note || "" }),
        ]
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
