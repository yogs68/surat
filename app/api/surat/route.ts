import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { cookieName, verifySession } from "@/lib/auth";

type Prioritas = "Rendah" | "Normal" | "Tinggi";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

async function nextNomorSurat(conn: any) {
  // Format: PBSI/SPR/001/I/2026 (naik per tahun, reset tiap tahun)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const roman = [
    "I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII",
  ][month - 1];

  const [rows] = await conn.query<any[]>(
    `
    SELECT no
    FROM surat
    WHERE no LIKE ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [`PBSI/SPR/%/${roman}/${year}`]
  );

  let seq = 1;
  if (rows?.[0]?.no) {
    const parts = String(rows[0].no).split("/");
    // PBSI/SPR/001/I/2026 -> parts[2]=001
    const last = Number(parts?.[2] ?? 0);
    if (!Number.isNaN(last) && last > 0) seq = last + 1;
  }

  return `PBSI/SPR/${pad3(seq)}/${roman}/${year}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    const where = q
      ? `WHERE (s.no LIKE ? OR s.judul LIKE ? OR s.bidang LIKE ? OR u.name LIKE ?)`
      : "";
    const args = q ? [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] : [];

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        s.no, s.judul, s.bidang, s.status, s.prioritas,
        COALESCE(u.name,'-') AS pemohon,
        s.updated_at
      FROM surat s
      LEFT JOIN users u ON u.id = s.created_by
      ${where}
      ORDER BY s.updated_at DESC
      `,
      args
    );

    return NextResponse.json({
      ok: true,
      items: (rows ?? []).map((r) => ({
        no: String(r.no),
        judul: String(r.judul),
        bidang: String(r.bidang),
        status: String(r.status),
        prioritas: String(r.prioritas),
        pemohon: String(r.pemohon),
        updatedAt: r.updated_at ? String(r.updated_at).replace("T", " ").slice(0, 19) : "-",
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value ?? null;
  const sess = verifySession(token);
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { judul?: string; bidang?: string; ringkasan?: string; prioritas?: Prioritas };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const judul = (body.judul ?? "").trim();
  const bidang = (body.bidang ?? "").trim();
  const ringkasan = (body.ringkasan ?? "").trim();
  const prioritas: Prioritas = (body.prioritas ?? "Normal") as Prioritas;

  if (!judul || !bidang || !ringkasan) {
    return NextResponse.json(
      { ok: false, error: "judul, bidang, ringkasan wajib diisi" },
      { status: 400 }
    );
  }
  if (!["Rendah", "Normal", "Tinggi"].includes(prioritas)) {
    return NextResponse.json({ ok: false, error: "prioritas tidak valid" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const no = await nextNomorSurat(conn);

    // Insert surat
    const [ins] = await conn.query<any>(
      `
      INSERT INTO surat (no, judul, bidang, ringkasan, status, prioritas, created_by)
      VALUES (?, ?, ?, ?, 'MENUNGGU_APPROVAL', ?, ?)
      `,
      [no, judul, bidang, ringkasan, prioritas, sess.userId]
    );

    const suratId = ins.insertId;

    // Buat approval steps default
    // (yang actionable pertama step 1, tapi biar UI rapi kita set semua MENUNGGU)
    await conn.query(
      `
      INSERT INTO approval_steps (surat_id, step, role, status)
      VALUES
        (?, 1, 'WAKETUM', 'MENUNGGU'),
        (?, 2, 'SEKJEN',  'MENUNGGU'),
        (?, 3, 'BENDUM',  'MENUNGGU'),
        (?, 4, 'EKSEKUTOR','MENUNGGU')
      `,
      [suratId, suratId, suratId, suratId]
    );

    // Audit log
    await conn.query(
      `
      INSERT INTO audit_logs (surat_id, actor_id, action, meta)
      VALUES (?, ?, 'CREATE_SURAT', ?)
      `,
      [suratId, sess.userId, JSON.stringify({ no, judul, bidang, prioritas })]
    );

    await conn.commit();

    return NextResponse.json({ ok: true, no });
  } catch (e: any) {
    await conn.rollback();
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
