"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ActionNoteDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmText: string;
  onConfirm: (note: string) => Promise<void> | void;
}) {
  const { open, onOpenChange, title, description, confirmText, onConfirm } = props;

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setNote("");
      setLoading(false);
    }
  }, [open]);

  const submit = async () => {
    setLoading(true);
    try {
      await onConfirm(note);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">Catatan</div>
          <Textarea
            className="min-h-[120px] rounded-2xl"
            placeholder="Tulis catatan… (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button className="rounded-2xl" onClick={submit} disabled={loading}>
            {loading ? "Proses..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
