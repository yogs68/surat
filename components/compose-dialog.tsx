"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Paperclip, Trash2, Upload } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type Prioritas = "Rendah" | "Normal" | "Tinggi";

function fmtKB(bytes: number) {
  const kb = Math.max(1, Math.round(bytes / 1024));
  return `${kb} KB`;
}

export function ComposeDialog({ open, onOpenChange }: Props) {
  const [judul, setJudul] = useState("");
  const [bidang, setBidang] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [prioritas, setPrioritas] = useState<Prioritas>("Normal");

  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState<string>("");

  const canSubmit = useMemo(() => {
    return judul.trim() && bidang.trim() && ringkasan.trim() && !loading && !uploading;
  }, [judul, bidang, ringkasan, loading, uploading]);

  const reset = () => {
    setJudul("");
    setBidang("");
    setRingkasan("");
    setPrioritas("Normal");
    setFiles([]);
    setLoading(false);
    setUploading(false);
    setProgressText("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickFiles = () => fileRef.current?.click();

  const onChooseFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);

    // batasan simpel (boleh kamu ubah)
    const maxPerFile = 10 * 1024 * 1024; // 10MB
    const filtered = arr.filter((f) => f.size <= maxPerFile);

    if (filtered.length !== arr.length) {
      toast("Sebagian file ditolak", { description: "Max 10MB per file." });
    }

    // gabung + prevent duplicate by name+size
    setFiles((prev) => {
      const map = new Map<string, File>();
      for (const p of prev) map.set(`${p.name}|${p.size}`, p);
      for (const f of filtered) map.set(`${f.name}|${f.size}`, f);
      return Array.from(map.values());
    });

    // reset input supaya bisa pilih file yang sama lagi
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function createSurat(): Promise<string> {
    const res = await fetch("/api/surat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judul: judul.trim(),
        bidang: bidang.trim(),
        ringkasan: ringkasan.trim(),
        prioritas,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error ?? "Gagal membuat surat");
    return String(out.no);
  }

  async function uploadOne(no: string, f: File) {
    const fd = new FormData();
    fd.append("file", f);

    const res = await fetch(`/api/surat/${encodeURIComponent(no)}/lampiran`, {
      method: "POST",
      body: fd,
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error ?? `Upload gagal: ${f.name}`);
  }

  const submit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      // 1) CREATE surat dulu
      const no = await createSurat();
      toast("Surat dibuat", { description: `Nomor: ${no}` });

      // 2) Kalau ada file, upload satu-satu
      if (files.length) {
        setUploading(true);
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setProgressText(`Upload ${i + 1}/${files.length}: ${f.name}`);
          await uploadOne(no, f);
        }
        toast("Lampiran terupload", { description: `${files.length} file` });
      }

      // selesai
      onOpenChange(false);
      reset();

      // refresh list inbox/dashboard (cara paling aman)
      window.location.reload();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Gagal" });
    } finally {
      setLoading(false);
      setUploading(false);
      setProgressText("");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-[680px] bg-background/70 backdrop-blur">
        <DialogHeader>
          <DialogTitle>Buat Surat</DialogTitle>
          <DialogDescription>Isi data surat. Setelah dibuat, masuk status Menunggu Approval.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-2xl border bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">Judul</div>
            <Input
              className="mt-2 rounded-2xl"
              placeholder="Contoh: Usulan Pengadaan Shuttlecock"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              disabled={loading || uploading}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">Bidang</div>
              <Input
                className="mt-2 rounded-2xl"
                placeholder="Contoh: Sarpras / Kejuaraan"
                value={bidang}
                onChange={(e) => setBidang(e.target.value)}
                disabled={loading || uploading}
              />
            </div>

            <div className="rounded-2xl border bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">Prioritas</div>
              <select
                className="mt-2 w-full rounded-2xl border bg-background/60 px-3 py-2 text-sm outline-none"
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value as Prioritas)}
                disabled={loading || uploading}
              >
                <option value="Rendah">Rendah</option>
                <option value="Normal">Normal</option>
                <option value="Tinggi">Tinggi</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border bg-background/60 p-3">
            <div className="text-xs text-muted-foreground">Ringkasan</div>
            <textarea
              className="mt-2 w-full min-h-[140px] rounded-2xl border bg-background/60 px-3 py-2 text-sm outline-none"
              placeholder="Tulis ringkasan kebutuhan/tujuan surat..."
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value)}
              disabled={loading || uploading}
            />
          </div>

          {/* LAMPIRAN BENERAN */}
          <Card className="rounded-2xl bg-background/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Lampiran</CardTitle>
                  <CardDescription className="text-xs">
                    Pilih file dulu. Setelah klik “Buat Surat”, sistem akan upload otomatis.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => onChooseFiles(e.target.files)}
                    disabled={loading || uploading}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl"
                    onClick={pickFiles}
                    disabled={loading || uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2">
              {files.length ? (
                <div className="grid gap-2">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}|${f.size}|${idx}`}
                      className="flex items-center justify-between rounded-2xl border bg-background/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{fmtKB(f.size)}</div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => removeFile(idx)}
                        disabled={loading || uploading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                  Belum ada lampiran.
                </div>
              )}

              {uploading && progressText ? (
                <div className="rounded-2xl border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  {progressText}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            disabled={loading || uploading}
          >
            Batal
          </Button>

          <Button type="button" className="rounded-2xl" onClick={submit} disabled={!canSubmit}>
            {uploading ? "Uploading..." : loading ? "Menyimpan..." : "Buat Surat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
