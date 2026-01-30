import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import { cookieName, verifySession } from "@/lib/auth";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtKB(bytes: number) {
  const kb = Math.max(1, Math.round(Number(bytes || 0) / 1024));
  return `${kb} KB`;
}

function safeName(name: string) {
  return String(name || "file").replace(/[^\w.\-() ]+/g, "_").slice(0, 160);
}

async function safeUnlink(absPath: string) {
  try {
    await unlink(absPath);
  } catch {
    // ignore: file mungkin udah gak ada
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ no: string }> }) {
  const { no } = await ctx.params;
  const decodedNo = decodeURIComponent(no);

  const [suratRows] = await pool.query<any[]>(
    `SELECT id FROM surat WHERE no = ? LIMIT 1`,
    [decodedNo]
  );
  const suratId = suratRows?.[0]?.id;
  if (!suratId) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Single file: ambil yang terbaru (kalau ada)
  const [rows] = await pool.query<any[]>(
    `
    SELECT id, original_name, stored_name, mime, size, created_at
    FROM attachments
    WHERE surat_id = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [suratId]
  );

  const r = rows?.[0];
  return NextResponse.json({
    ok: true,
    item: r
      ? {
          id: Number(r.id),
          name: String(r.original_name),
          stored: String(r.stored_name),
          mime: r.mime ? String(r.mime) : null,
          sizeBytes: Number(r.size ?? 0),
          size: fmtKB(Number(r.size ?? 0)),
          url: `/uploads/${String(r.stored_name)}`,
          createdAt: r.created_at ? String(r.created_at).replace("T", " ").slice(0, 19) : "-",
        }
      : null,
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ no: string }> }) {
  // Auth
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value ?? null;
  const sess = verifySession(token);
  if (!sess) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { no } = await ctx.params;
  const decodedNo = decodeURIComponent(no);

  // cari surat
  const [suratRows] = await pool.query<any[]>(
    `SELECT id FROM surat WHERE no = ? LIMIT 1`,
    [decodedNo]
  );
  const suratId = suratRows?.[0]?.id;
  if (!suratId) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // read form-data
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file wajib" }, { status: 400 });
  }

  // limit 10MB
  const max = 10 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ ok: false, error: "Max 10MB" }, { status: 413 });
  }

  const original = safeName(file.name || "file");
  const ext = path.extname(original).slice(0, 12);
  const stored = `${crypto.randomUUID()}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ambil lampiran lama (kalau ada)
    const [oldRows] = await conn.query<any[]>(
      `
      SELECT id, stored_name
      FROM attachments
      WHERE surat_id = ?
      ORDER BY id DESC
      `,
      [suratId]
    );

    // 2) hapus semua row lama (biar benar2 single)
    if ((oldRows ?? []).length) {
      const ids = oldRows.map((x) => Number(x.id)).filter(Boolean);
      if (ids.length) {
        await conn.query(`DELETE FROM attachments WHERE id IN (?)`, [ids]);
      }
    }

    // 3) simpan file baru ke disk
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, stored), bytes);

    // 4) insert row baru
    const [result]: any = await conn.query(
      `
      INSERT INTO attachments (surat_id, original_name, stored_name, mime, size)
      VALUES (?, ?, ?, ?, ?)
      `,
      [suratId, original, stored, file.type || null, file.size]
    );

    // 5) update surat updated_at biar list kiri “fresh”
    try {
      await conn.query(`UPDATE surat SET updated_at = NOW() WHERE id=?`, [suratId]);
    } catch {}

    await conn.commit();

    // 6) hapus file lama DI LUAR transaction (biar gak ganggu DB kalau gagal unlink)
    for (const o of oldRows ?? []) {
      if (o?.stored_name) {
        await safeUnlink(path.join(uploadDir, String(o.stored_name)));
      }
    }

    const id = Number(result?.insertId ?? 0) || 0;

    return NextResponse.json({
      ok: true,
      item: {
        id,
        name: original,
        stored,
        url: `/uploads/${stored}`,
        sizeBytes: file.size,
        size: fmtKB(file.size),
        mime: file.type || null,
      },
    });
  } catch (e: any) {
    await conn.rollback();

    // kalau DB gagal setelah file tersimpan, hapus file baru biar gak jadi sampah
    await safeUnlink(path.join(uploadDir, stored));

    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
