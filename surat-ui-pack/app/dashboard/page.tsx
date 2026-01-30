"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Mail, Timer, ShieldCheck, TrendingUp } from "lucide-react";

const stats = [
  { title: "Surat Masuk", value: "12", desc: "Baru minggu ini", icon: Mail },
  { title: "Menunggu Approval", value: "8", desc: "Perlu tindakan", icon: Timer },
  { title: "Selesai", value: "20", desc: "Bulan ini", icon: ShieldCheck },
  { title: "Total Surat", value: "37", desc: "Semua status", icon: FileText },
];

const bottleneck = [
  { step: "Sekjen", avg: "1.8 hari", count: 5, status: "Perlu dipercepat" },
  { step: "Bendum", avg: "1.2 hari", count: 3, status: "Normal" },
  { step: "Waketum", avg: "0.6 hari", count: 2, status: "Cepat" },
];

export default function DashboardPage() {
  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      subtitle="Ringkasan proses surat & indikator bottleneck (tampilan lebih premium)."
      roleLabel="Bidang"
      rightActions={
        <Button asChild className="rounded-2xl">
          <Link href="/inbox">Buka Inbox</Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} className="rounded-2xl bg-background/70 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.title}
                  </CardTitle>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">
                    {s.value}
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/60 p-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-3 bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Trend Aktivitas</CardTitle>
            <CardDescription>Placeholder chart (nanti kita ganti Recharts).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Aktivitas 12 minggu
              </div>

              <div className="mt-4 grid grid-cols-12 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border bg-muted/40"
                    style={{ height: 24 + (i % 5) * 10 }}
                  />
                ))}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                *Akan dihubungkan ke data real setelah backend.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2 bg-background/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Bottleneck Approval</CardTitle>
            <CardDescription>Rata-rata waktu tunggu per step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bottleneck.map((b) => (
              <div key={b.step} className="rounded-2xl border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{b.step}</div>
                  <Badge variant={b.status === "Perlu dipercepat" ? "destructive" : "secondary"}>
                    {b.avg}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.count} surat menunggu • {b.status}
                </div>
              </div>
            ))}

            <Separator />

            <div className="text-xs text-muted-foreground">
              Nanti bottleneck dihitung dari <span className="font-medium">audit log</span> +{" "}
              <span className="font-medium">timestamp approval</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
