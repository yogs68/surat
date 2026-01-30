"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  FileText,
  PlayCircle,
  Filter,
  Timer,
} from "lucide-react";

type DashData = {
  filter: { bidang: string };
  options: { bidang: string[] };
  stats: {
    total: number;
    draft: number;
    menunggu: number;
    revisi: number;
    disetujui: number;
    dieksekusi: number;
    selesai: number;
    ditolak: number;
  };
  bottleneck: {
    method: string;
    topRole: string;
    topCount: number;
    oldestHours: number;
    items: {
      no: string;
      judul: string;
      bidang: string;
      step: number;
      role: string;
      since: string;
      ageHours: number;
    }[];
  };
  latest: {
    no: string;
    judul: string;
    bidang: string;
    pemohon: string;
    status: string;
    prioritas: string;
    updatedAt: string;
  }[];
  activity: {
    suratNo: string;
    bidang: string;
    action: string;
    at: string;
    actorName: string;
    actorRole: string;
    meta: string;
  }[];
};

function StatusBadge({ s }: { s: string }) {
  const label =
    s === "DRAFT"
      ? "Draft"
      : s === "MENUNGGU_APPROVAL"
      ? "Menunggu"
      : s === "REVISI"
      ? "Revisi"
      : s === "DISETUJUI"
      ? "Disetujui"
      : s === "DIEKSEKUSI"
      ? "Dieksekusi"
      : s === "SELESAI"
      ? "Selesai"
      : s === "DITOLAK"
      ? "Ditolak"
      : s;

  const variant =
    label === "Ditolak"
      ? "destructive"
      : label === "Menunggu" || label === "Revisi" || label === "Draft"
      ? "secondary"
      : "default";

  return <Badge variant={variant as any}>{label}</Badge>;
}

function PriorBadge({ p }: { p: string }) {
  const label = p === "Rendah" || p === "Normal" || p === "Tinggi" ? p : p;
  const variant = label === "Tinggi" ? "destructive" : label === "Rendah" ? "outline" : "secondary";
  return <Badge variant={variant as any}>{label}</Badge>;
}

function prettyHours(h: number) {
  if (!h || h < 0) return "0 jam";
  if (h < 24) return `${h} jam`;
  const d = Math.floor(h / 24);
  const r = h % 24;
  return r ? `${d} hari ${r} jam` : `${d} hari`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [bidang, setBidang] = useState<string>("");

  const load = async (b: string) => {
    try {
      const qs = b ? `?bidang=${encodeURIComponent(b)}` : "";
      const res = await fetch(`/api/dashboard${qs}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Gagal load dashboard");
      setData(j as DashData);
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Gagal load dashboard" });
    }
  };

  useEffect(() => {
    load(bidang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bidang]);

  const s = data?.stats;
  const bidangOptions = data?.options?.bidang ?? [];
  const bn = data?.bottleneck;

  const bars = useMemo(() => {
    if (!s) return [];
    const items = [
      { key: "Draft", val: s.draft },
      { key: "Menunggu", val: s.menunggu },
      { key: "Revisi", val: s.revisi },
      { key: "Disetujui", val: s.disetujui },
      { key: "Dieksekusi", val: s.dieksekusi },
      { key: "Selesai", val: s.selesai },
      { key: "Ditolak", val: s.ditolak },
    ];
    const max = Math.max(1, ...items.map((x) => x.val));
    return items.map((x) => ({ ...x, pct: Math.round((x.val / max) * 100) }));
  }, [s]);

  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      subtitle="Ringkasan status surat + bottleneck approval + activity terbaru."
      roleLabel="-"
      rightActions={
        <>
          {/* Filter Bidang */}
          <div className="hidden md:flex items-center gap-2 rounded-2xl border bg-background/60 px-3 py-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="bg-transparent text-sm outline-none"
              value={bidang}
              onChange={(e) => setBidang(e.target.value)}
            >
              <option value="">Semua Bidang</option>
              {bidangOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <Button className="rounded-2xl" onClick={() => load(bidang)}>
            Refresh
          </Button>
        </>
      }
    >
      {/* Mobile filter */}
      <div className="md:hidden mb-3">
        <div className="flex items-center gap-2 rounded-2xl border bg-background/60 px-3 py-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="w-full bg-transparent text-sm outline-none"
            value={bidang}
            onChange={(e) => setBidang(e.target.value)}
          >
            <option value="">Semua Bidang</option>
            {bidangOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP STATS */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Surat</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" /> {bidang ? bidang : "Semua"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Menunggu</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.menunggu ?? 0}</div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Revisi</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.revisi ?? 0}</div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Selesai / Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">
              {(s?.selesai ?? 0)}/{(s?.ditolak ?? 0)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" />
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck */}
      <div className="mt-4">
        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Bottleneck Approval</CardTitle>
                <CardDescription>
                  Pending paling banyak & paling lama.{" "}
                  <span className="text-muted-foreground">({bn?.method ?? "-"})</span>
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-2xl">
                  Role: {bn?.topRole ?? "-"}
                </Badge>
                <Badge className="rounded-2xl">
                  Pending: {bn?.topCount ?? 0}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border bg-background/60 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Oldest Pending</div>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {prettyHours(bn?.oldestHours ?? 0)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                (estimasi dari waktu “since”)
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-3 lg:col-span-2">
              <div className="text-sm font-medium mb-2">Top 5 Pending Terlama</div>
              <div className="space-y-2">
                {(bn?.items ?? []).map((it) => (
                  <div key={it.no + it.step} className="rounded-2xl border bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{it.judul}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {it.no} • {it.bidang} • Step {it.step} ({it.role})
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Since: {it.since}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-2xl">
                          {prettyHours(it.ageHours)}
                        </Badge>
                        <Link href={`/surat/${encodeURIComponent(it.no)}`}>
                          <Button variant="ghost" size="sm" className="rounded-2xl">
                            Buka
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {!(bn?.items ?? []).length ? (
                  <div className="rounded-2xl border bg-background/60 p-3 text-sm text-muted-foreground">
                    Tidak ada pending steps.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribusi + Latest */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-2 bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle>Distribusi Status</CardTitle>
            <CardDescription>{bidang ? `Filter: ${bidang}` : "Semua bidang"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bars.map((b) => (
              <div key={b.key} className="rounded-2xl border bg-background/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{b.key}</div>
                  <div className="text-sm font-semibold">{b.val}</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full bg-foreground/80" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-3 bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle>Surat Terbaru</CardTitle>
            <CardDescription>Klik untuk buka detail.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.latest ?? []).map((x) => (
              <div key={x.no} className="rounded-2xl border bg-background/60 hover:bg-muted/50">
                <Link href={`/surat/${encodeURIComponent(x.no)}`} className="block p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{x.judul}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {x.no} • {x.bidang} • {x.pemohon}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Update: {x.updatedAt}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge s={x.status} />
                      <PriorBadge p={x.prioritas} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}

            {!(data?.latest ?? []).length ? (
              <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
                Belum ada data.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Extra cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Draft</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.draft ?? 0}</div>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Disetujui</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.disetujui ?? 0}</div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Dieksekusi</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-semibold">{s?.dieksekusi ?? 0}</div>
            <PlayCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <div className="mt-4">
        <Card className="rounded-2xl bg-background/70 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>
              {bidang ? `Audit log untuk bidang: ${bidang}` : "Audit log semua bidang"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.activity ?? []).map((a, idx) => (
              <div key={idx} className="rounded-2xl border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {a.actorName} <span className="text-muted-foreground">({a.actorRole})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.at}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Surat: <span className="font-medium text-foreground">{a.suratNo}</span> • Bidang:{" "}
                  <span className="font-medium text-foreground">{a.bidang}</span> • Action:{" "}
                  <span className="font-medium text-foreground">{a.action}</span>
                </div>
              </div>
            ))}

            {!(data?.activity ?? []).length ? (
              <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
                Belum ada aktivitas.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
