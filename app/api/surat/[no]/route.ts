import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmtDT(v: any) {
  if (!v) return "-";
  return String(v).replace("T", " ").slice(0, 19);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ no: string }> }
) {
  try {
    const { no } = await ctx.params;
    const decodedNo = decodeURIComponent(no);

    // 1) Surat utama
    const [suratRows] = await pool.query<any[]>(
      `
      SELECT
        s.id, s.no, s.judul, s.bidang, s.ringkasan, s.status, s.prioritas,
        COALESCE(u.name,'-') AS pemohon,
        s.updated_at
      FROM surat s
      LEFT JOIN users u ON u.id = s.created_by
      WHERE s.no = ?
      LIMIT 1
      `,
      [decodedNo]
    );

    const surat = suratRows?.[0];
    if (!surat) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const suratId = surat.id;

    // 2) Lampiran (pakai attachments table)
    let lampiranRows: any[] = [];
    try {
      const [rows] = await pool.query<any[]>(
        `
        SELECT id, original_name, stored_name, size, mime, created_at
        FROM attachments
        WHERE surat_id = ?
        ORDER BY id DESC
        `,
        [suratId]
      );
      lampiranRows = rows ?? [];
    } catch {
      // kalau tabel attachments belum ada, jangan bikin error
      lampiranRows = [];
    }

    // 3) Approval steps
    //    Support 2 skema:
    //    A) approval_steps(surat_id, step, role, status, note, acted_at)
    //    B) approval_steps(no, step, role, status, note, acted_at)
    let approvalRows: any[] = [];
    try {
      const [rowsA] = await pool.query<any[]>(
        `
        SELECT step, role, status, note, acted_at
        FROM approval_steps
        WHERE surat_id = ?
        ORDER BY step ASC
        `,
        [suratId]
      );
      approvalRows = rowsA ?? [];
    } catch {
      const [rowsB] = await pool.query<any[]>(
        `
        SELECT step, role, status, note, acted_at
        FROM approval_steps
        WHERE no = ?
        ORDER BY step ASC
        `,
        [decodedNo]
      );
      approvalRows = rowsB ?? [];
    }

    return NextResponse.json({
      ok: true,
      surat: {
        no: String(surat.no),
        judul: String(surat.judul),
        bidang: String(surat.bidang),
        status: String(surat.status),
        prioritas: String(surat.prioritas),
        pemohon: String(surat.pemohon),
        updatedAt: fmtDT(surat.updated_at),
        ringkasan: String(surat.ringkasan ?? ""),

        lampiran: (lampiranRows ?? []).map((a) => ({
          id: Number(a.id),
          name: String(a.original_name),
          size: `${Math.max(1, Math.round(Number(a.size ?? 0) / 1024))} KB`,
          url: `/uploads/${String(a.stored_name)}`,
          mime: a.mime ? String(a.mime) : null,
        })),

        approvals: (approvalRows ?? []).map((ap) => ({
          step: Number(ap.step),
          role: String(ap.role),
          status: String(ap.status), // MENUNGGU/DISETUJUI/DITOLAK/REVISI
          at: ap.acted_at ? fmtDT(ap.acted_at) : undefined,
          note: ap.note ? String(ap.note) : undefined,
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
