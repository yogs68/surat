"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import {
  LayoutDashboard,
  Mail,
  Users,
  Settings,
  FileText,
  Bell,
  Sparkles,
} from "lucide-react";

type NavKey = "dashboard" | "inbox";

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <Button
      asChild
      variant={active ? "default" : "ghost"}
      className="w-full justify-start rounded-2xl"
    >
      <Link href={href}>
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

export function AppShell({
  active,
  title,
  subtitle,
  roleLabel = "Bidang",
  rightActions,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle: string;
  roleLabel?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-grid min-h-screen">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex md:w-72 md:flex-col md:gap-2 md:border-r md:bg-background/70 md:backdrop-blur md:p-4">
          {/* Brand */}
          <div className="flex items-center gap-3 rounded-2xl border bg-background/70 p-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border bg-background">
              <Image src="/logo.svg" alt="logo" fill className="p-1" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">SURAT</div>
              <div className="text-xs text-muted-foreground">
                PBSI Tracking Suite
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-2 grid gap-1">
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              active={active === "dashboard"}
            />
            <NavItem
              href="/inbox"
              icon={Mail}
              label="Inbox"
              active={active === "inbox"}
            />
            <Button
              variant="ghost"
              className="w-full justify-start rounded-2xl text-muted-foreground"
              disabled
            >
              <Users className="mr-2 h-4 w-4" />
              Pengguna (soon)
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-2xl text-muted-foreground"
              disabled
            >
              <Settings className="mr-2 h-4 w-4" />
              Pengaturan (soon)
            </Button>
          </nav>

          {/* Sidebar footer */}
          <div className="mt-auto rounded-2xl border bg-background/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">Lazdro</div>
                <div className="text-xs text-muted-foreground truncate">
                  Role: {roleLabel}
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Topbar */}
          <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
              <div className="flex items-center justify-between gap-3">
                {/* Mobile brand */}
                <div className="flex items-center gap-3 md:hidden">
                  <div className="relative h-9 w-9 overflow-hidden rounded-2xl border bg-background">
                    <Image src="/logo.svg" alt="logo" fill className="p-1" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold">SURAT</div>
                    <div className="text-[11px] text-muted-foreground">
                      PBSI Tracking
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="hidden md:block">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {title}
                    </h1>
                    <Badge variant="secondary" className="rounded-2xl">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      {roleLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {rightActions}
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl"
                    aria-label="notifikasi"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <div className="md:hidden">
                    <LogoutButton />
                  </div>
                </div>
              </div>

              {/* Mobile title row */}
              <div className="mt-3 md:hidden">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight">
                    {title}
                  </h1>
                  <Badge variant="secondary" className="rounded-2xl">
                    {roleLabel}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom hint bar (aesthetic) */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 md:hidden">
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="rounded-2xl border bg-background/80 backdrop-blur px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tip: buka detail surat dengan klik item di inbox.
          </div>
        </div>
      </div>
    </div>
  );
}
