"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Box, EllipsisVertical, HardDrive, Layers, Pencil, Plus, QrCode, ScanLine, Search, Trash2, TrendingUp } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { UploadWizard } from "@/components/upload-wizard";
import { useModels } from "@/components/models-store";
import type { ArModel } from "@/lib/models";

function MetricCard({
  label,
  value,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  icon: typeof Box;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="size-[18px]" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function ModelMenu({ model, onDelete }: { model: ArModel; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute right-3 top-3 z-10">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions for ${model.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-lg bg-white/80 text-slate-500 shadow-sm ring-1 ring-slate-200/70 backdrop-blur transition hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <EllipsisVertical className="size-4" />
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10">
          <Link
            role="menuitem"
            href={`/models/${model.id}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <Pencil className="size-4 text-slate-400" aria-hidden /> Edit
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ModelCard({ model, onDelete }: { model: ArModel; onDelete: () => void }) {
  return (
    <Card className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
      <ModelMenu model={model} onDelete={onDelete} />
      <Link href={`/models/${model.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 rounded-2xl">
        <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-slate-100 to-slate-200/70">
          <Box className="size-14 text-slate-300 transition group-hover:scale-110 group-hover:text-indigo-400" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium text-slate-900">{model.name}</h3>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge status={model.status} />
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500" title="Total scans">
              <QrCode className="size-4 text-slate-400" aria-hidden />
              <span className="tabular-nums">{model.scans.toLocaleString()}</span>
              <span className="sr-only">scans</span>
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { models, addModel, removeModel } = useModels();
  const [query, setQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const filtered = models.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const totalScans = models.reduce((s, m) => s + m.scans, 0);
  const active = models.filter((m) => m.status === "active").length;
  const storageUsed = models.reduce((s, m) => s + parseFloat(m.fileSize), 0);
  const storageLimit = 100;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-8">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              aria-label="Search models"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Notifications (3 unread)"
              className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Bell className="size-[18px]" />
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">Create New Model</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">My Models</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your 3D assets, AR links and QR codes.</p>
        </div>

        <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total Scans" value={totalScans.toLocaleString()} icon={ScanLine}>
            <p className="flex items-center gap-1.5 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                <TrendingUp className="size-3.5" aria-hidden /> 18.2%
              </span>
              <span className="text-slate-500">vs last month</span>
            </p>
          </MetricCard>
          <MetricCard label="Active AR Models" value={String(active)} icon={Layers}>
            <p className="text-sm text-slate-500">
              {models.length - active} draft{models.length - active === 1 ? "" : "s"} awaiting payment
            </p>
          </MetricCard>
          <MetricCard label="Storage Used" value={`${storageUsed.toFixed(1)} MB`} icon={HardDrive}>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Storage used"
              aria-valuemin={0}
              aria-valuemax={storageLimit}
              aria-valuenow={storageUsed}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${Math.min(100, (storageUsed / storageLimit) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">of {storageLimit} MB on Pro plan</p>
          </MetricCard>
        </section>

        <section aria-label="Models" className="mt-8">
          {filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => (
                <ModelCard key={m.id} model={m} onDelete={() => removeModel(m.id)} />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Search className="size-6" aria-hidden />
              </div>
              <p className="mt-4 font-medium text-slate-900">{query ? `No models match “${query}”` : "No models yet"}</p>
              <p className="mt-1 text-sm text-slate-500">Upload a video or photos to generate your first 3D model.</p>
              <Button className="mt-5" onClick={() => setWizardOpen(true)}>
                <Plus className="size-4" aria-hidden /> Create New Model
              </Button>
            </Card>
          )}
        </section>
      </main>

      {wizardOpen && (
        <UploadWizard
          onClose={() => setWizardOpen(false)}
          onComplete={(name, status) => {
            const model = addModel(name, status);
            setWizardOpen(false);
            if (status === "active") router.push(`/models/${model.id}`);
          }}
        />
      )}
    </>
  );
}
