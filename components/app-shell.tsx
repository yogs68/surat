"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { LayoutGrid, Mail, Settings, Users, Menu } from "lucide-react";

type ActiveKey = "dashboard" | "inbox" | "users" | "settings";

type MeUser = {
  id: number;
  name: string;
  email: string;
  role: string; // DB role: WAKETUM/...
};

export function AppShell({
  children,
  active,
  title,
  subtitle,
  roleLabel,
  rightActions,
}: {
  children: React.ReactNode;
  active: ActiveKey;
  title: string;
  subtitle?: string;
  roleLabel?: string; // fallback kalau belum ada user
  rightActions?: React.ReactNode;
}) {
  const pathname = usePathname();

  const [me, setMe] = useState<MeUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      setMe(j.user ?? null);
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    loadMe();
  }, [pathname]);

  const prettyRole = useMemo(() => {
    const r = (me?.role ?? roleLabel ?? "").toString().toUpperCase();
    if (!r) return "-";
    if (r === "WAKETUM") return "Waketum";
    if (r === "SEKJEN") return "Sekjen";
    if (r === "BENDUM") return "Bendum";
    if (r === "EKSEKUTOR") return "Eksekutor";
    if (r === "BIDANG") return "Bidang";
    if (r === "AUDITOR") return "Auditor";
    return r;
  }, [me?.role, roleLabel]);

  const nav = [
    { key: "dashboard" as const, href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "inbox" as const, href: "/inbox", label: "Inbox", icon: Mail },
    { key: "users" as const, href: "#", label: "Pengguna (soon)", icon: Users, disabled: true },
    { key: "settings" as const, href: "#", label: "Pengaturan (soon)", icon: Settings, disabled: true },
  ];

  const NavButtons = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="space-y-1">
      {nav.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.key;
        const cls = cn(
          "w-full justify-start rounded-2xl",
          isActive ? "bg-foreground text-background hover:bg-foreground" : "hover:bg-muted/50"
        );

        if (it.disabled) {
          return (
            <Button
              key={it.key}
              variant={isActive ? "default" : "ghost"}
              className={cn(cls, "opacity-50 cursor-not-allowed")}
              disabled
            >
              <Icon className="mr-3 h-4 w-4" />
              {it.label}
            </Button>
          );
        }

        return (
          <Link
            key={it.key}
            href={it.href}
            onClick={() => {
              onNavigate?.();
            }}
          >
            <Button variant={isActive ? "default" : "ghost"} className={cls}>
              <Icon className="mr-3 h-4 w-4" />
              {it.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.04),transparent_55%),radial-gradient(circle_at_bottom,rgba(0,0,0,0.05),transparent_50%)]">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* SIDEBAR (Desktop) */}
          <aside className="hidden lg:block">
            <div className="rounded-3xl border bg-background/70 backdrop-blur p-4">
              <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-3">
                <div className="h-10 w-10 rounded-2xl border bg-muted/50 grid place-items-center">
                  <span className="text-sm font-semibold">S</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">SURAT</div>
                  <div className="text-xs text-muted-foreground truncate">PBSI Tracking Suite</div>
                </div>
              </div>

              <div className="mt-4">
                <NavButtons />
              </div>

              <div className="mt-6 rounded-2xl border bg-background/60 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{me?.name ?? "User"}</div>
                  <div className="text-xs text-muted-foreground truncate">Role: {prettyRole}</div>
                </div>
                <LogoutButton />
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main>
            <div className="rounded-3xl border bg-background/70 backdrop-blur">
              {/* TOPBAR */}
              <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {/* Mobile menu */}
                    <div className="lg:hidden">
                      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="icon" className="rounded-2xl">
                            <Menu className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>

                        <SheetContent side="left" className="w-[320px] sm:w-[360px]">
                          <SheetHeader>
                            <SheetTitle>Menu</SheetTitle>
                          </SheetHeader>

                          <div className="mt-4 rounded-2xl border bg-background/60 p-3 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl border bg-muted/50 grid place-items-center">
                              <span className="text-sm font-semibold">S</span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-tight">SURAT</div>
                              <div className="text-xs text-muted-foreground truncate">PBSI Tracking Suite</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <NavButtons onNavigate={() => setMobileOpen(false)} />
                          </div>

                          <div className="mt-6 rounded-2xl border bg-background/60 p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{me?.name ?? "User"}</div>
                              <div className="text-xs text-muted-foreground truncate">Role: {prettyRole}</div>
                            </div>
                            <LogoutButton />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>

                    <div className="text-xl font-semibold">{title}</div>
                    <div className="rounded-2xl border bg-background/60 px-3 py-1 text-xs">
                      {prettyRole}
                    </div>
                  </div>
                  {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
                </div>
                <div className="flex items-center gap-2">{rightActions}</div>
              </div>

              {/* CONTENT */}
              <div className="p-4">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
