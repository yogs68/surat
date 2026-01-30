"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ComposeDialog } from "@/components/compose-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Search, Plus, Timer, Paperclip } from "lucide-react";

type Status = "Menunggu" | "Revisi" | "Selesai" | "Ditolak";
type Prior = "Rendah" | "Normal" | "Tinggi";

type Surat = {
  no: string;
  judul: string;
  bidang: string;
  status: Status;
  prior: Prior;
  pemohon: string;
  updatedAt: string;
  ringkasan: string;
  lampiran: { name: string; size: string }[];
  approvals: { step: number; role: string; status: "Menunggu" | "Disetujui" | "Ditolak" | "Revisi"; at?: string; note?: string }[];
};

const dummy: Surat[] = [
  {
    no: "PBSI/SPR/001/I/2026",
    judul: "Usulan Pengadaan Shuttlecock",
    bidang: "Sarpras",
    status: "Menunggu",
    prior: "Tinggi",
    pemohon: "Ari (Bidang Sarpras)",
    updatedAt: "2026-01-22 14:35",
    ringkasan:
      "Pengadaan shuttlecock untuk TC nasional 3 bulan. Dibutuhkan 1200 tube. Estimasi biaya Rp 180.000.000.",
    lampiran: [
      { name: "RAB_Shuttlecock.pdf", size: "312 KB" },
      { name: "PenawaranVendor.xlsx", size: "86 KB" },
    ],
    approvals: [
      { step: 1, role: "Waketum", status: "Disetujui", at: "2026-01-18 11:02" },
      { step: 2, role: "Sekjen", status: "Menunggu" },
      { step: 3, role: "Bendum", status: "Menunggu" },
      { step: 4, role: "Eksekutor", status: "Menunggu" },
    ],
  },
  {
    no: "PBSI/SPR/017/I/2026",
    judul: "Perjalanan Dinas Kejuaraan Asia",
    bidang: "Kejuaraan",
    status: "Revisi",
    prior: "Normal",
    pemohon: "Nina (Bidang Kejuaraan)",
    updatedAt: "2026-01-20 10:12",
    ringkasan:
      "Perjalanan dinas tim pendamping. Mohon revisi detail rincian biaya akomodasi dan tiket.",
    lampiran: [{ name: "RincianBiaya.docx", size: "54 KB" }],
    approvals: [
      {
        step: 1,
        role: "Waketum",
        status: "Revisi",
        at: "2026-01-19 09:14",
        note: "Mohon rinci tiket & hotel per orang. Tambahkan justifikasi harga.",
      },
      { step: 2, role: "Sekjen", status: "Menunggu" },
      { step: 3, role: "Bendum", status: "Menunggu" },
      { step: 4, role: "Eksekutor", status: "Menunggu" },
    ],
  },
  {
    no: "PBSI/SPR/021/I/2026",
    judul: "Perbaikan Lampu Gedung Latihan",
    bidang: "Sarpras",
    status: "Selesai",
    prior: "Rendah",
    pemohon: "Ari (Bidang Sarpras)",
    updatedAt: "2026-01-15 17:01",
    ringkasan:
      "Penggantian lampu LED area lapangan 1–4. Sudah selesai dikerjakan vendor. Lampirkan BA serah terima.",
    lampiran: [{ name: "BA_SerahTerima.pdf", size: "140 KB" }],
    approvals: [
      { step: 1, role: "Waketum", status: "Disetujui", at: "2026-01-06 10:05" },
      { step: 2, role: "Sekjen", status: "Disetujui", at: "2026-01-07 13:27" },
      { step: 3, role: "Bendum", status: "Disetujui", at: "2026-01-07 15:10" },
      { step: 4, role: "Eksekutor", status: "Disetujui", at: "2026-01-10 09:43" },
    ],
  },
];

function StatusBadge({ s }: { s: Status }) {
  const variant =
    s === "Ditolak" ? "destructive" : s === "Menunggu" || s === "Revisi" ? "secondary" : "default";
  return <Badge variant={variant as any}>{s}</Badge>;
}
function PriorBadge({ p }: { p: Prior }) {
  const variant = p === "Tinggi" ? "destructive" : p === "Rendah" ? "outline" : "secondary";
  return <Badge variant={variant as any}>{p}</Badge>;
}

export default function InboxPage() {
  const [openCompose, setOpenCompose] = useState(false);
  const [q, setQ] = useState(""); 
  const [selectedNo, setSelectedNo] = useState(dummy[0].no);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return dummy;
    return dummy.filter((x) =>
      [x.no, x.judul, x.bidang, x.pemohon].some((v) => v.toLowerCase().includes(s))
    );
  }, [q]);

  const selected = useMemo(
    () => items.find((x) => x.no === selectedNo) ?? items[0],
    [items, selectedNo]
  );

  const act = (type: "approve" | "reject" | "revise") => {
    toast(`${type.toUpperCase()} (demo)`, { description: `Surat: ${selected?.no}` });
  };

  return (
    <AppShell
      active="inbox"
      title="Inbox Surat"
      subtitle="Split-view desktop + mobile pindah halaman. Tampilan lebih branded."
      roleLabel="Bidang"
      rightActions={
        <>
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-[320px] rounded-2xl pl-9"
              placeholder="Cari nomor/judul/pemohon…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button className="rounded-2xl" onClick={() => setOpenCompose(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Buat
          </Button>
        </>
      }
    >
      {/* Mobile search */}
      <div className="relative md:hidden">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="w-full rounded-2xl pl-9"
          placeholder="Cari…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* LEFT */}
        <Card className="rounded-2xl lg:col-span-3 bg-background/70 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>Daftar Surat</CardTitle>
            <CardDescription>Klik item. Desktop: detail muncul di kanan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((s) => (
              <div key={s.no} className="rounded-2xl border bg-background/60 hover:bg-muted/50">
                <Link href={`/surat/${encodeURIComponent(s.no)}`} className="block p-3 lg:hidden">
                  <RowContent s={s} />
                </Link>

                <button
                  className={`hidden w-full p-3 text-left lg:block ${selectedNo === s.no ? "bg-muted/60" : ""}`}
                  onClick={() => setSelectedNo(s.no)}
                >
                  <RowContent s={s} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RIGHT */}
        <div className="hidden lg:block lg:col-span-2">
          <Card className="rounded-2xl bg-background/70 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{selected?.judul}</CardTitle>
                  <CardDescription>{selected?.no}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selected ? <StatusBadge s={selected.status} /> : null}
                  {selected ? <PriorBadge p={selected.prior} /> : null}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Pemohon</div>
                <div className="text-sm font-medium">{selected?.pemohon}</div>
                <div className="mt-2 text-xs text-muted-foreground">Update</div>
                <div className="text-sm font-medium">{selected?.updatedAt}</div>
              </div>

              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="mb-1 text-xs text-muted-foreground">Ringkasan</div>
                <p className="text-sm leading-relaxed">{selected?.ringkasan}</p>
              </div>

              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Lampiran</div>
                  <Button variant="outline" size="sm" className="rounded-2xl">
                    Upload
                  </Button>
                </div>

                <div className="grid gap-2">
                  {selected?.lampiran.map((a) => (
                    <div key={a.name} className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">{a.size}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-2xl">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Timeline Approval</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Timer className="h-4 w-4" /> SLA
                  </div>
                </div>

                <div className="space-y-2">
                  {selected?.approvals.map((ap) => (
                    <div key={ap.step} className="rounded-2xl border bg-background/60 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Step {ap.step}: {ap.role}</div>
                        <Badge
                          variant={
                            ap.status === "Ditolak"
                              ? "destructive"
                              : ap.status === "Menunggu" || ap.status === "Revisi"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {ap.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{ap.at ?? "Belum diproses"}</div>
                      {ap.note ? (
                        <div className="mt-1 rounded-2xl bg-muted/50 p-2 text-xs">
                          <span className="font-medium">Catatan:</span> {ap.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-2xl" onClick={() => act("approve")}>Approve</Button>
                  <Button variant="destructive" className="rounded-2xl" onClick={() => act("reject")}>Reject</Button>
                  <Button variant="outline" className="rounded-2xl" onClick={() => act("revise")}>Minta Revisi</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComposeDialog open={openCompose} onOpenChange={setOpenCompose} />
    </AppShell>
  );
}

function RowContent({ s }: { s: Surat }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-sm font-medium">{s.judul}</div>
        <div className="text-xs text-muted-foreground">
          {s.no} • {s.bidang} • {s.pemohon}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Update: {s.updatedAt}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge s={s.status} />
        <PriorBadge p={s.prior} />
      </div>
    </div>
  );
}
