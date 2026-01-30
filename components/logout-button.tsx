"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout gagal");
      toast("Logout berhasil");
      router.push("/login");
      router.refresh();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Logout gagal" });
    }
  };

  return (
    <Button variant="outline" className="rounded-2xl" onClick={logout}>
      Logout
    </Button>
  );
}
