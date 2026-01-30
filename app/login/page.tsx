"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("waketum@pbsi.id");
  const [password, setPassword] = useState("waketum123");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Login gagal");
      }

      toast("Login berhasil");
      router.push("/inbox");
      router.refresh();
    } catch (e: any) {
      toast("Error", { description: e?.message ?? "Login gagal" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-md rounded-2xl bg-background/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Masuk ke PBSI Surat Tracking Suite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Email</div>
            <Input className="rounded-2xl" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Password</div>
            <Input
              className="rounded-2xl"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button className="w-full rounded-2xl" disabled={loading} onClick={submit}>
            {loading ? "Masuk..." : "Masuk"}
          </Button>

          <div className="text-xs text-muted-foreground">
            Demo login (sementara). Nanti kita ganti password_hash pakai bcrypt.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
