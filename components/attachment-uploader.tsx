"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AttachmentUploader({
  no,
  onDone,
}: {
  no: string;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/surat/${encodeURIComponent(no)}/lampiran`, {
        method: "POST",
        body: fd,
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Upload gagal");

      toast("Upload berhasil", { description: file.name });
      onDone?.();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Upload gagal" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.currentTarget.value = "";
        }}
      />
      <Button variant="outline" size="sm" className="rounded-2xl" onClick={pick} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </Button>
    </>
  );
}
