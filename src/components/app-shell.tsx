"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, ChartColumn, CreditCard, LogOut, Menu, Settings, X, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { ModelsProvider } from "@/components/models-store";
import { cn } from "@/lib/cn";

const nav: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/dashboard", label: "My Models", icon: Box, match: (p) => p === "/dashboard" || p.startsWith("/models") },
  { href: "/analytics", label: "Analytics", icon: ChartColumn, match: (p) => p === "/analytics" },
  { href: "/billing", label: "Billing", icon: CreditCard, match: (p) => p === "/billing" },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p === "/settings" },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-indigo-600" : "text-slate-400")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-sm font-semibold text-white">
          JC
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">Jane Cooper</p>
          <p className="truncate text-xs text-slate-500">jane@studio.co</p>
        </div>
        <Link
          href="/"
          aria-label="Log out"
          className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <LogOut className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <ModelsProvider>
      <div className="min-h-screen bg-slate-50">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white lg:block">
          <Sidebar />
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl animate-fade-up">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-6 grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          <div className="flex items-center justify-between border-b border-slate-200/70 bg-white px-4 py-3 lg:hidden">
            <Logo />
            <button
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="size-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModelsProvider>
  );
}
