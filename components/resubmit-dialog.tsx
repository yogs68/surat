"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResubmitDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: { judul: string; bidang: string; ringkasan: string };
  onSubmit: (payload: { judul: string; bidang: string; ringkasan: string }) => Promise<void>;
}) {
  const { open, onOpenChange, initial, onSubmit } = props;

  const [judul, setJudul] = useState(initial.judul);
  const [bidang, setBidang] = useState(initial.bidang);
  const [ringkasan, setRingkasan] = useState(initial.ringkasan);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setJudul(initial.judul);
      setBidang(initial.bidang);
      setRingkasan(initial.ringkasan);
      setLoading(false);
    }
  }, [open, initial.judul, initial.bidang, initial.ringkasan]);

  const submit = async () => {
    const j = judul.trim();
    const b = bidang.trim();
    const r = ringkasan.trim();
    if (!j || !b || !r) return;

    setLoading(true);
    try {
      await onSubmit({ judul: j, bidang: b, ringkasan: r });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Kirim Ulang (Revisi)</DialogTitle>
          <DialogDescription>
            Edit isi surat sesuai catatan revisi, lalu kirim ulang ke approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Judul</div>
            <Input className="mt-2 rounded-2xl" value={judul} onChange={(e) => setJudul(e.target.value)} />
          </div>

          <div>
            <div className="text-sm font-medium">Bidang</div>
            <Input className="mt-2 rounded-2xl" value={bidang} onChange={(e) => setBidang(e.target.value)} />
          </div>

          <div>
            <div className="text-sm font-medium">Ringkasan</div>
            <textarea
              className="mt-2 w-full min-h-[140px] rounded-2xl border bg-background/60 px-3 py-2 text-sm outline-none"
              value={ringkasan}
              onChange={(e) => setRingkasan(e.target.value)}
              placeholder="Tulis ringkasan…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button className="rounded-2xl" onClick={submit} disabled={loading || !judul.trim() || !bidang.trim() || !ringkasan.trim()}>
            {loading ? "Mengirim..." : "Kirim Ulang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
