"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { Box, Check, CloudUpload, CreditCard, FileVideo, Images, LoaderCircle, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import type { ModelStatus } from "@/lib/models";
import { cn } from "@/lib/cn";

type Step = 1 | 2 | 3;

const tasks = ["Extracting frames", "Computing NeRF data", "Optimizing for WebAR"];
const PROCESSING_MS = 7000;

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Upload", "Processing", "Ready"];
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const current = step === n;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-indigo-600 text-white",
                current && "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600",
                !done && !current && "bg-slate-100 text-slate-400",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn("hidden text-sm font-medium sm:inline", current ? "text-slate-900" : "text-slate-400")}>{label}</span>
            {i < labels.length - 1 && <span className={cn("h-px w-6 sm:w-10", done ? "bg-indigo-600" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-44" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#eef2ff" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          className="transition-[stroke-dashoffset] duration-200 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ perspective: 400 }}>
        <div className="cube relative size-14">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <span className="mt-5 text-sm font-semibold tabular-nums text-slate-700">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

export function UploadWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (name: string, status: ModelStatus) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paying, setPaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !paying && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, paying]);

  useEffect(() => {
    if (step !== 2) return;
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(100, ((performance.now() - start) / PROCESSING_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => setStep(3), 500);
      }
    }, 100);
    return () => clearInterval(id);
  }, [step]);

  const acceptFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = Array.from(list).filter((f) => f.type === "video/mp4" || f.type.startsWith("image/"));
    if (!accepted.length) return;
    setFiles(accepted);
    if (!name) {
      const base = accepted[0].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      setName(base.charAt(0).toUpperCase() + base.slice(1));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFiles(e.dataTransfer.files);
  };

  const checkout = () => {
    setPaying(true);
    setTimeout(() => onComplete(name.trim(), "active"), 1400);
  };

  const isVideo = files[0]?.type === "video/mp4";
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !paying && onClose()} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-fade-up relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 outline-none"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <StepIndicator step={step} />
          <button
            onClick={onClose}
            disabled={paying}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 id={titleId} className="text-xl font-semibold tracking-tight">Create a new 3D model</h2>
              <p className="mt-1 text-sm text-slate-500">Upload a short walk-around video or a batch of photos of your product.</p>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40",
                )}
              >
                <div className="grid size-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                  <CloudUpload className="size-7" aria-hidden />
                </div>
                <p className="mt-4 max-w-xs text-sm text-slate-600">
                  <span className="font-semibold text-indigo-600">Drag and drop</span> your video (MP4) or image batch here, or{" "}
                  <span className="font-semibold text-indigo-600">click to browse</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-400">MP4 up to 500 MB · JPG/PNG, 20–200 images</p>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,image/*"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => acceptFiles(e.target.files)}
              />

              {files.length > 0 && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    {isVideo ? <FileVideo className="size-5" /> : <Images className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {files.length === 1 ? files[0].name : `${files.length} images selected`}
                    </p>
                    <p className="text-xs text-slate-500">{formatBytes(totalSize)}</p>
                  </div>
                  <button
                    onClick={() => setFiles([])}
                    aria-label="Remove files"
                    className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              <form
                className="mt-6 space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(2);
                }}
              >
                <Input
                  id="model-name"
                  label="Model Name"
                  placeholder="e.g. Nike Sneaker"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!files.length || !name.trim()}>
                    Next
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-up flex flex-col items-center text-center" aria-live="polite">
              <ProgressRing value={progress} />
              <h2 id={titleId} className="mt-6 text-xl font-semibold tracking-tight">
                Generating your 3D mesh…
              </h2>
              <p className="mt-1 text-sm text-slate-500">This usually takes 2–3 minutes.</p>
              <ul className="mt-8 w-full max-w-xs space-y-3 text-left">
                {tasks.map((task, i) => {
                  const threshold = ((i + 1) / tasks.length) * 100;
                  const done = progress >= threshold;
                  const active = !done && progress >= (i / tasks.length) * 100;
                  return (
                    <li key={task} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full transition-all duration-300",
                          done ? "scale-100 bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : active ? (
                          <LoaderCircle className="size-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-slate-300" />
                        )}
                      </span>
                      <span className={cn("text-sm transition-colors", done ? "font-medium text-slate-900" : active ? "text-slate-700" : "text-slate-400")}>
                        {task}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-up text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
                <Check className="size-7" strokeWidth={3} aria-hidden />
              </div>
              <h2 id={titleId} className="mt-5 text-xl font-semibold tracking-tight">
                {name} is ready
              </h2>
              <p className="mt-1 text-sm text-slate-500">Your 3D model was generated successfully.</p>

              <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 via-slate-100 to-violet-100">
                <div className="absolute inset-0 grid place-items-center blur-[6px]">
                  <Box className="size-36 text-indigo-500/80" strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
                    <Lock className="size-3.5" aria-hidden /> Preview locked
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-left">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden />
                <p className="text-sm text-indigo-900">
                  <span className="font-semibold">Your model is ready!</span> Pay to unlock AR hosting and download your QR code.
                </p>
              </div>

              <Button size="lg" className="mt-6 w-full" onClick={checkout} disabled={paying}>
                {paying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                {paying ? "Redirecting to Stripe…" : "Checkout with Stripe ($4.99)"}
              </Button>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> Secure payment
                </span>
                <button
                  onClick={() => onComplete(name.trim(), "draft")}
                  disabled={paying}
                  className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  Save as draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
