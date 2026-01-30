"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ComposeDialog } from "@/components/compose-dialog";
import { ActionNoteDialog } from "@/components/action-note-dialog";
import { ResubmitDialog } from "@/components/resubmit-dialog";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Search, Plus, Timer, Paperclip } from "lucide-react";

type SuratListItem = {
  no: string;
  judul: string;
  bidang: string;
  status: string;
  prioritas: string;
  pemohon: string;
  updatedAt: string;
};

type SuratDetail = {
  no: string;
  judul: string;
  bidang: string;
  status: string;
  prioritas: string;
  pemohon: string;
  updatedAt: string;
  ringkasan: string;
  lampiran: { id: number; name: string; size: string; url: string; mime?: string | null }[];
  approvals: {
    step: number;
    role: string;
    status: "MENUNGGU" | "DISETUJUI" | "DITOLAK" | "REVISI";
    at?: string;
    note?: string;
  }[];
};

type MeResponse = {
  user: null | { id: number; role: string; name: string; email: string };
};

function mapStatusLabel(s: string) {
  if (s === "MENUNGGU_APPROVAL") return "Menunggu";
  if (s === "REVISI") return "Revisi";
  if (s === "SELESAI") return "Selesai";
  if (s === "DITOLAK") return "Ditolak";
  if (s === "DISETUJUI") return "Disetujui";
  if (s === "DIEKSEKUSI") return "Dieksekusi";
  if (s === "DRAFT") return "Draft";
  return s;
}

function StatusBadge({ s }: { s: string }) {
  const label = mapStatusLabel(s);
  const variant =
    label === "Ditolak"
      ? "destructive"
      : label === "Menunggu" || label === "Revisi" || label === "Draft"
      ? "secondary"
      : "default";
  return <Badge variant={variant as any}>{label}</Badge>;
}

function PriorBadge({ p }: { p: string }) {
  const variant = p === "Tinggi" ? "destructive" : p === "Rendah" ? "outline" : "secondary";
  return <Badge variant={variant as any}>{p}</Badge>;
}

function ApprovalBadge({ s }: { s: "MENUNGGU" | "DISETUJUI" | "DITOLAK" | "REVISI" }) {
  const label =
    s === "MENUNGGU"
      ? "Menunggu"
      : s === "DISETUJUI"
      ? "Disetujui"
      : s === "DITOLAK"
      ? "Ditolak"
      : "Revisi";
  const variant =
    s === "DITOLAK" ? "destructive" : s === "MENUNGGU" || s === "REVISI" ? "secondary" : "default";
  return <Badge variant={variant as any}>{label}</Badge>;
}

function roleToStep(role: string) {
  const r = String(role || "").toUpperCase();
  if (r === "WAKETUM") return 1;
  if (r === "SEKJEN") return 2;
  if (r === "BENDUM") return 3;
  if (r === "EKSEKUTOR") return 4;
  return null;
}

export default function InboxPage() {
  const [openCompose, setOpenCompose] = useState(false);
  const [q, setQ] = useState("");

  const [me, setMe] = useState<MeResponse["user"]>(null);

  const [items, setItems] = useState<SuratListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedNo, setSelectedNo] = useState<string>("");
  const [selected, setSelected] = useState<SuratDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // popup catatan
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteMode, setNoteMode] = useState<"reject" | "revise">("reject");

  // popup kirim ulang
  const [resubmitOpen, setResubmitOpen] = useState(false);

  // upload lampiran (single file)
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as MeResponse;
      setMe(j.user ?? null);
    } catch {
      setMe(null);
    }
  };

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/surat${qs}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Gagal load surat");

      const list: SuratListItem[] = (j.items ?? []).map((x: any) => ({
        no: String(x.no),
        judul: String(x.judul),
        bidang: String(x.bidang),
        status: String(x.status),
        prioritas: String(x.prioritas),
        pemohon: String(x.pemohon),
        updatedAt: String(x.updatedAt),
      }));

      setItems(list);
      if (!selectedNo && list[0]?.no) setSelectedNo(list[0].no);
      if (selectedNo && !list.some((x) => x.no === selectedNo) && list[0]?.no) {
        setSelectedNo(list[0].no);
      }
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Gagal load surat" });
    } finally {
      setLoadingList(false);
    }
  };

  const fetchDetail = async (no: string) => {
    if (!no) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/surat/${encodeURIComponent(no)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Gagal load detail surat");
      setSelected(j.surat as SuratDetail);
    } catch (e: any) {
      setSelected(null);
      toast("Error", { description: e?.message ?? "Gagal load detail surat" });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchMe();
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchList(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!selectedNo) return;
    fetchDetail(selectedNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNo]);

  const activeStepInfo = useMemo(() => {
    const aps = selected?.approvals ?? [];
    const active = aps.find((x) => x.status === "MENUNGGU" || x.status === "REVISI");
    if (!active) return null;
    return { step: active.step, role: String(active.role).toUpperCase(), status: active.status };
  }, [selected]);

  const canAct = useMemo(() => {
    if (!me || !activeStepInfo || !selected) return false;
    const myStep = roleToStep(me.role);
    return myStep === activeStepInfo.step && String(me.role).toUpperCase() === activeStepInfo.role;
  }, [me, activeStepInfo, selected]);

  const isBidang = String(me?.role ?? "").toUpperCase() === "BIDANG";
  const canResubmit = isBidang && selected?.status === "REVISI";

  const doAction = async (type: "approve" | "reject" | "revise", note: string) => {
    if (!selected?.no) return;

    if (!canAct) {
      const msg = activeStepInfo
        ? `Bukan giliran kamu. Giliran: Step ${activeStepInfo.step} (${activeStepInfo.role})`
        : "Tidak ada step aktif.";
      toast("Tidak bisa", { description: msg });
      return;
    }

    try {
      const res = await fetch(`/api/surat/${encodeURIComponent(selected.no)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Aksi gagal");

      toast("OK", { description: `${type.toUpperCase()} • ${selected.no}` });

      await fetchDetail(selected.no);
      await fetchList();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Aksi gagal" });
    }
  };

  const doResubmit = async (payload: { judul: string; bidang: string; ringkasan: string }) => {
    if (!selected?.no) return;
    try {
      const res = await fetch(`/api/surat/${encodeURIComponent(selected.no)}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Gagal kirim ulang");

      toast("Berhasil", { description: "Surat dikirim ulang ke approval." });
      await fetchDetail(selected.no);
      await fetchList();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Gagal kirim ulang" });
      throw e;
    }
  };

  const doUpload = async (file: File) => {
    if (!selected?.no) return;

    if (!canAct) {
      toast("Tidak bisa upload", { description: "Upload hanya boleh saat giliran kamu" });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/surat/${encodeURIComponent(selected.no)}/lampiran`, {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Upload gagal");

      toast("Upload berhasil", { description: file.name });

      await fetchDetail(selected.no);
      await fetchList();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Upload gagal" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clickApprove = () => doAction("approve", "");
  const clickReject = () => {
    setNoteMode("reject");
    setNoteOpen(true);
  };
  const clickRevise = () => {
    setNoteMode("revise");
    setNoteOpen(true);
  };

  return (
    <AppShell
      active="inbox"
      title="Inbox Surat"
      subtitle="Split-view desktop + mobile pindah halaman. Tampilan lebih branded."
      roleLabel={me?.role ?? "-"}
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
            {loadingList ? (
              <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : null}

            {!loadingList && !items.length ? (
              <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
                Tidak ada data.
              </div>
            ) : null}

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
                  <CardTitle className="text-lg">
                    {loadingDetail ? "Loading..." : selected?.judul ?? "Pilih surat"}
                  </CardTitle>
                  <CardDescription>{selected?.no ?? "-"}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selected ? <StatusBadge s={selected.status} /> : null}
                  {selected ? <PriorBadge p={selected.prioritas} /> : null}
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {activeStepInfo ? (
                  <>
                    Giliran:{" "}
                    <span className="font-medium text-foreground">
                      Step {activeStepInfo.step} ({activeStepInfo.role})
                    </span>{" "}
                    {canAct ? (
                      <Badge className="ml-2" variant="default">
                        Giliran kamu
                      </Badge>
                    ) : (
                      <Badge className="ml-2" variant="secondary">
                        Menunggu role lain
                      </Badge>
                    )}
                  </>
                ) : (
                  <>Tidak ada step aktif.</>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Pemohon</div>
                <div className="text-sm font-medium">{selected?.pemohon ?? "-"}</div>

                <div className="mt-2 text-xs text-muted-foreground">Update</div>
                <div className="text-sm font-medium">{selected?.updatedAt ?? "-"}</div>
              </div>

              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="mb-1 text-xs text-muted-foreground">Ringkasan</div>
                <p className="text-sm leading-relaxed">{selected?.ringkasan ?? "-"}</p>
              </div>

              {/* LAMPIRAN */}
              <div className="rounded-2xl border bg-background/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Lampiran</div>

                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) doUpload(f);
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => fileRef.current?.click()}
                    disabled={!selected || uploading || !canAct}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>

                <div className="grid gap-2">
                  {(selected?.lampiran ?? []).length ? (
                    selected!.lampiran.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.size}</div>
                          </div>
                        </div>
                        <a href={a.url} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="rounded-2xl">
                            Download
                          </Button>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                      Belum ada lampiran.
                    </div>
                  )}
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
                  {(selected?.approvals ?? []).map((ap) => (
                    <div key={ap.step} className="rounded-2xl border bg-background/60 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Step {ap.step}: {ap.role}
                        </div>
                        <ApprovalBadge s={ap.status} />
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

                {/* ACTIONS */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-2xl" onClick={clickApprove} disabled={!selected || !canAct}>
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-2xl"
                    onClick={clickReject}
                    disabled={!selected || !canAct}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={clickRevise}
                    disabled={!selected || !canAct}
                  >
                    Minta Revisi
                  </Button>

                  {canResubmit ? (
                    <Button className="rounded-2xl" variant="secondary" onClick={() => setResubmitOpen(true)}>
                      Kirim Ulang
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ComposeDialog open={openCompose} onOpenChange={setOpenCompose} />

      <ActionNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        title={noteMode === "reject" ? "Reject surat" : "Minta revisi"}
        description="Tambahkan catatan (opsional)."
        confirmText={noteMode === "reject" ? "Reject" : "Minta Revisi"}
        onConfirm={async (note) => {
          await doAction(noteMode, note);
        }}
      />

      <ResubmitDialog
        open={resubmitOpen}
        onOpenChange={setResubmitOpen}
        initial={{
          judul: selected?.judul ?? "",
          bidang: selected?.bidang ?? "",
          ringkasan: selected?.ringkasan ?? "",
        }}
        onSubmit={doResubmit}
      />
    </AppShell>
  );
}

function RowContent({ s }: { s: SuratListItem }) {
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
        <PriorBadge p={s.prioritas} />
      </div>
    </div>
  );
}
