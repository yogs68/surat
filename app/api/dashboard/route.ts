import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function fmtDT(v: any) {
  if (!v) return "-";
  return String(v).replace("T", " ").slice(0, 19);
}

function toCSV(rows: Record<string, any>[]) {
  const esc = (x: any) => {
    const s = String(x ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const header = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const bidang = (url.searchParams.get("bidang") ?? "").trim();

    // threshold "tertahan" default 72 jam (3 hari)
    const thresholdHours = Math.max(1, Number(url.searchParams.get("thresholdHours") ?? 72));

    // export mode (untuk Excel/PowerBI)
    const exportMode = (url.searchParams.get("export") ?? "").trim().toLowerCase(); // "stuck"

    const whereBidang = bidang ? "WHERE s.bidang = ?" : "";
    const argsBidang: any[] = bidang ? [bidang] : [];

    // 0) List bidang untuk dropdown
    const [bidangRows] = await pool.query<any[]>(
      `SELECT DISTINCT bidang FROM surat ORDER BY bidang ASC`
    );

    // 1) Count surat per status (filtered)
    const [statusRows] = await pool.query<any[]>(
      `
      SELECT s.status, COUNT(*) as total
      FROM surat s
      ${whereBidang}
      GROUP BY s.status
      `,
      argsBidang
    );

    const map: Record<string, number> = {};
    for (const r of statusRows ?? []) {
      map[String(r.status)] = Number(r.total);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);

    // 2) Latest 8 surat (filtered)
    const [latestRows] = await pool.query<any[]>(
      `
      SELECT
        s.no,
        s.judul,
        s.bidang,
        COALESCE(u.name, '-') AS pemohon,
        s.status,
        s.prioritas,
        s.updated_at
      FROM surat s
      LEFT JOIN users u ON u.id = s.created_by
      ${whereBidang}
      ORDER BY s.updated_at DESC
      LIMIT 8
      `,
      argsBidang
    );

    // 3) Latest 10 audit logs (filtered by bidang lewat join surat)
    const [auditRows] = await pool.query<any[]>(
      `
      SELECT
        al.action,
        al.created_at,
        al.meta,
        COALESCE(u.name, 'System') AS actor_name,
        COALESCE(u.role, '-') AS actor_role,
        COALESCE(s.no, '-') AS surat_no,
        COALESCE(s.bidang, '-') AS bidang
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_id
      LEFT JOIN surat s ON s.id = al.surat_id
      ${bidang ? "WHERE s.bidang = ?" : ""}
      ORDER BY al.created_at DESC
      LIMIT 10
      `,
      argsBidang
    );

    /**
     * =========================================================
     * ANALYTICS (Audit): avg waktu per tahap + stuck list + volume
     * =========================================================
     *
     * Target:
     * - Avg waktu proses per tahap (step 1..4)
     * - Surat tertahan > thresholdHours
     * - Volume surat per periode
     *
     * Penting:
     * - Jangan hitung surat yang sudah final: DITOLAK / SELESAI
     * - Step aktif = step terkecil dengan status MENUNGGU/REVISI
     * - Since untuk step aktif = waktu step mulai aktif
     *   (ideal: approval_steps.created_at; fallback: LAG(acted_at) / surat.created_at / surat.updated_at)
     */

    // Helper kondisi bidang untuk query join surat
    const extraBidang = bidang ? "AND s.bidang = ?" : "";
    const extraBidangArgs = bidang ? [bidang] : [];

    // ---------- A) AVG WAKTU PROSES PER TAHAP ----------
    // Kita hitung durasi step yang sudah selesai (acted_at NOT NULL)
    // start_time = LAG(acted_at) (step sebelumnya) atau s.created_at
    // durasi = acted_at - start_time
    let avgPerStage: any[] = [];
    try {
      const [rows] = await pool.query<any[]>(
        `
        WITH steps AS (
          SELECT
            ap.surat_id,
            ap.step,
            ap.role,
            ap.status,
            ap.acted_at,
            LAG(ap.acted_at) OVER (PARTITION BY ap.surat_id ORDER BY ap.step) AS prev_acted_at
          FROM approval_steps ap
        ),
        joined AS (
          SELECT
            s.id AS surat_id,
            s.bidang,
            steps.step,
            steps.role,
            steps.status,
            steps.acted_at,
            COALESCE(steps.prev_acted_at, s.created_at, s.updated_at) AS start_time
          FROM steps
          JOIN surat s ON s.id = steps.surat_id
          WHERE steps.acted_at IS NOT NULL
          ${bidang ? "AND s.bidang = ?" : ""}
        )
        SELECT
          step,
          role,
          COUNT(*) AS sample,
          AVG(TIMESTAMPDIFF(HOUR, start_time, acted_at)) AS avg_hours
        FROM joined
        GROUP BY step, role
        ORDER BY step ASC
        `,
        extraBidangArgs
      );

      avgPerStage = (rows ?? []).map((r) => ({
        step: Number(r.step),
        role: String(r.role),
        sample: Number(r.sample ?? 0),
        avgHours: Number(r.avg_hours ?? 0),
        avgDays: Number(r.avg_hours ?? 0) / 24,
      }));
    } catch {
      // Fallback kalau approval_steps gak punya surat_id (pakai no)
      const [rows] = await pool.query<any[]>(
        `
        WITH steps AS (
          SELECT
            ap.no,
            ap.step,
            ap.role,
            ap.status,
            ap.acted_at,
            LAG(ap.acted_at) OVER (PARTITION BY ap.no ORDER BY ap.step) AS prev_acted_at
          FROM approval_steps ap
        ),
        joined AS (
          SELECT
            s.no,
            s.bidang,
            steps.step,
            steps.role,
            steps.status,
            steps.acted_at,
            COALESCE(steps.prev_acted_at, s.created_at, s.updated_at) AS start_time
          FROM steps
          JOIN surat s ON s.no = steps.no
          WHERE steps.acted_at IS NOT NULL
          ${bidang ? "AND s.bidang = ?" : ""}
        )
        SELECT
          step,
          role,
          COUNT(*) AS sample,
          AVG(TIMESTAMPDIFF(HOUR, start_time, acted_at)) AS avg_hours
        FROM joined
        GROUP BY step, role
        ORDER BY step ASC
        `,
        extraBidangArgs
      );

      avgPerStage = (rows ?? []).map((r) => ({
        step: Number(r.step),
        role: String(r.role),
        sample: Number(r.sample ?? 0),
        avgHours: Number(r.avg_hours ?? 0),
        avgDays: Number(r.avg_hours ?? 0) / 24,
      }));
    }

    // ---------- B) SURAT "TERTAHAN" (STUCK LIST) ----------
    // step aktif per surat = step min yang status MENUNGGU/REVISI
    // age_hours = NOW() - start_time_step_aktif
    // start_time = prev_acted_at atau s.created_at (fallback)
    // exclude surat status final
    let stuckItems: any[] = [];
    let oldestHours = 0;
    let pendingCount = 0;

    try {
      const [rows] = await pool.query<any[]>(
        `
        WITH base AS (
          SELECT
            s.id AS surat_id,
            s.no,
            s.judul,
            s.bidang,
            s.status AS surat_status,
            s.created_at,
            s.updated_at
          FROM surat s
          WHERE s.status NOT IN ('DITOLAK','SELESAI')
          ${bidang ? "AND s.bidang = ?" : ""}
        ),
        steps AS (
          SELECT
            ap.surat_id,
            ap.step,
            ap.role,
            ap.status,
            ap.note,
            ap.acted_at,
            LAG(ap.acted_at) OVER (PARTITION BY ap.surat_id ORDER BY ap.step) AS prev_acted_at
          FROM approval_steps ap
        ),
        active AS (
          SELECT
            b.*,
            st.step,
            st.role,
            st.status AS step_status,
            st.note,
            st.acted_at,
            COALESCE(st.prev_acted_at, b.created_at, b.updated_at) AS since_time,
            TIMESTAMPDIFF(HOUR, COALESCE(st.prev_acted_at, b.created_at, b.updated_at), NOW()) AS age_hours
          FROM base b
          JOIN steps st ON st.surat_id = b.surat_id
          WHERE st.status IN ('MENUNGGU','REVISI')
          -- ambil step terkecil yang masih pending (aktif)
          AND st.step = (
            SELECT MIN(st2.step)
            FROM steps st2
            WHERE st2.surat_id = b.surat_id
              AND st2.status IN ('MENUNGGU','REVISI')
          )
        )
        SELECT
          no, judul, bidang,
          step, role, step_status,
          since_time, age_hours
        FROM active
        ORDER BY age_hours DESC
        LIMIT 50
        `,
        extraBidangArgs
      );

      stuckItems = (rows ?? []).map((r) => ({
        no: String(r.no),
        judul: String(r.judul),
        bidang: String(r.bidang),
        step: Number(r.step),
        role: String(r.role),
        status: String(r.step_status), // MENUNGGU/REVISI
        since: fmtDT(r.since_time),
        ageHours: Number(r.age_hours ?? 0),
      }));

      pendingCount = stuckItems.length;
      oldestHours = stuckItems[0]?.ageHours ?? 0;
    } catch {
      // Fallback join pakai no
      const [rows] = await pool.query<any[]>(
        `
        WITH base AS (
          SELECT
            s.no,
            s.judul,
            s.bidang,
            s.status AS surat_status,
            s.created_at,
            s.updated_at
          FROM surat s
          WHERE s.status NOT IN ('DITOLAK','SELESAI')
          ${bidang ? "AND s.bidang = ?" : ""}
        ),
        steps AS (
          SELECT
            ap.no,
            ap.step,
            ap.role,
            ap.status,
            ap.note,
            ap.acted_at,
            LAG(ap.acted_at) OVER (PARTITION BY ap.no ORDER BY ap.step) AS prev_acted_at
          FROM approval_steps ap
        ),
        active AS (
          SELECT
            b.*,
            st.step,
            st.role,
            st.status AS step_status,
            st.note,
            st.acted_at,
            COALESCE(st.prev_acted_at, b.created_at, b.updated_at) AS since_time,
            TIMESTAMPDIFF(HOUR, COALESCE(st.prev_acted_at, b.created_at, b.updated_at), NOW()) AS age_hours
          FROM base b
          JOIN steps st ON st.no = b.no
          WHERE st.status IN ('MENUNGGU','REVISI')
          AND st.step = (
            SELECT MIN(st2.step)
            FROM steps st2
            WHERE st2.no = b.no
              AND st2.status IN ('MENUNGGU','REVISI')
          )
        )
        SELECT
          no, judul, bidang,
          step, role, step_status,
          since_time, age_hours
        FROM active
        ORDER BY age_hours DESC
        LIMIT 50
        `,
        extraBidangArgs
      );

      stuckItems = (rows ?? []).map((r) => ({
        no: String(r.no),
        judul: String(r.judul),
        bidang: String(r.bidang),
        step: Number(r.step),
        role: String(r.role),
        status: String(r.step_status),
        since: fmtDT(r.since_time),
        ageHours: Number(r.age_hours ?? 0),
      }));

      pendingCount = stuckItems.length;
      oldestHours = stuckItems[0]?.ageHours ?? 0;
    }

    // Filter yang benar-benar "tertahan" > threshold
    const stuckOverThreshold = stuckItems.filter((x) => (x.ageHours ?? 0) >= thresholdHours);

    // ---------- C) VOLUME SURAT PER PERIODE ----------
    // daily last 30 days, monthly last 12 months
    const [dailyRows] = await pool.query<any[]>(
      `
      SELECT
        DATE(s.created_at) AS d,
        COUNT(*) AS total
      FROM surat s
      ${bidang ? "WHERE s.bidang = ?" : "WHERE 1=1"}
        AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(s.created_at)
      ORDER BY d ASC
      `,
      argsBidang
    );

    const [monthlyRows] = await pool.query<any[]>(
      `
      SELECT
        DATE_FORMAT(s.created_at, '%Y-%m') AS ym,
        COUNT(*) AS total
      FROM surat s
      ${bidang ? "WHERE s.bidang = ?" : "WHERE 1=1"}
        AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(s.created_at, '%Y-%m')
      ORDER BY ym ASC
      `,
      argsBidang
    );

    // ---------- EXPORT CSV (opsional) ----------
    if (exportMode === "stuck") {
      const csv = toCSV(
        stuckOverThreshold.map((x) => ({
          no: x.no,
          judul: x.judul,
          bidang: x.bidang,
          step: x.step,
          role: x.role,
          status_step: x.status,
          since: x.since,
          age_hours: x.ageHours,
          threshold_hours: thresholdHours,
        }))
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="stuck_surat_${bidang ? bidang + "_" : ""}${thresholdHours}h.csv"`,
        },
      });
    }

    // ---------- Bottleneck (ringkas) ----------
    // topRole berdasarkan stuckItems (aktif pending)
    const roleCount: Record<string, number> = {};
    for (const it of stuckItems) roleCount[it.role] = (roleCount[it.role] ?? 0) + 1;
    const topRole = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    const topCount = roleCount[topRole] ?? 0;

    return NextResponse.json({
      ok: true,
      filter: { bidang: bidang || "" },
      options: {
        bidang: (bidangRows ?? []).map((r) => String(r.bidang)),
      },

      stats: {
        total,
        draft: map["DRAFT"] ?? 0,
        menunggu: map["MENUNGGU_APPROVAL"] ?? 0,
        revisi: map["REVISI"] ?? 0,
        disetujui: map["DISETUJUI"] ?? 0,
        dieksekusi: map["DIEKSEKSEUSI"] ?? map["DIEKSEKUSI"] ?? 0,
        selesai: map["SELESAI"] ?? 0,
        ditolak: map["DITOLAK"] ?? 0,
      },

      analytics: {
        avgPerStage, // rata2 durasi per step yang selesai
        stuck: {
          thresholdHours,
          totalActivePending: stuckItems.length,
          totalOverThreshold: stuckOverThreshold.length,
          items: stuckOverThreshold.slice(0, 50),
        },
        volume: {
          daily30: (dailyRows ?? []).map((r) => ({
            date: String(r.d),
            total: Number(r.total ?? 0),
          })),
          monthly12: (monthlyRows ?? []).map((r) => ({
            month: String(r.ym),
            total: Number(r.total ?? 0),
          })),
        },
      },

      bottleneck: {
        method: "active_step_since (prev_acted_at -> surat.created_at fallback)",
        topRole,
        topCount,
        oldestHours,
        pending: pendingCount,
        items: stuckItems.slice(0, 5), // top 5 pending terlama
      },

      latest: (latestRows ?? []).map((r) => ({
        no: String(r.no),
        judul: String(r.judul),
        bidang: String(r.bidang),
        pemohon: String(r.pemohon),
        status: String(r.status),
        prioritas: String(r.prioritas),
        updatedAt: r.updated_at ? fmtDT(r.updated_at) : "-",
      })),

      activity: (auditRows ?? []).map((r) => ({
        suratNo: String(r.surat_no),
        bidang: String(r.bidang),
        action: String(r.action),
        at: fmtDT(r.created_at),
        actorName: String(r.actor_name),
        actorRole: String(r.actor_role),
        meta: r.meta ? String(r.meta) : "{}",
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
