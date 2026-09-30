"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Box,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Download,
  FileBox,
  HardDrive,
  Layers,
  LoaderCircle,
  Lock,
  Rotate3d,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { ScanChart } from "@/components/scan-chart";
import { useModels } from "@/components/models-store";
import { formatDate, scanSeries, shortUrl } from "@/lib/models";
import { cn } from "@/lib/cn";

const swatches = [
  { name: "Midnight", value: "#0f172a", className: "bg-slate-900" },
  { name: "Indigo", value: "#4f46e5", className: "bg-indigo-600" },
  { name: "Emerald", value: "#047857", className: "bg-emerald-700" },
];

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { models, updateModel } = useModels();
  const model = models.find((m) => m.id === id);

  const [color, setColor] = useState(swatches[0].value);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);

  const url = model ? shortUrl(model.slug) : "";
  const series = useMemo(() => (model && model.status === "active" ? scanSeries(model.id) : Array(30).fill(0)), [model]);
  const last30 = series.reduce((s, v) => s + v, 0);

  useEffect(() => {
    if (!url) return;
    QRCode.toString(`https://${url}`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: color, light: "#ffffff" } }).then(setSvg);
  }, [url, color]);

  if (!model) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <BackLink />
        <Card className="mt-6 flex flex-col items-center px-6 py-16 text-center">
          <Box className="size-10 text-slate-300" aria-hidden />
          <p className="mt-4 font-medium">Model not found</p>
          <p className="mt-1 text-sm text-slate-500">It may have been deleted.</p>
        </Card>
      </main>
    );
  }

  const locked = model.status === "draft";
  const fileBase = model.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const copyLink = async () => {
    await navigator.clipboard.writeText(`https://${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadPng = async () => {
    const dataUrl = await QRCode.toDataURL(`https://${url}`, { width: 1024, margin: 2, color: { dark: color, light: "#ffffff" } });
    download(dataUrl, `${fileBase}-qr.png`);
  };

  const downloadSvg = () => {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(blobUrl, `${fileBase}-qr.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };

  const unlock = () => {
    setPaying(true);
    setTimeout(() => {
      updateModel(model.id, { status: "active" });
      setPaying(false);
    }, 1400);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <BackLink />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative grid aspect-square place-items-center bg-[radial-gradient(circle_at_center,_#eef2ff,_#e2e8f0)]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-40 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(circle,black,transparent_75%)]"
              />
              <Box className="relative size-32 text-indigo-400 drop-shadow-xl" strokeWidth={1} aria-label="3D model preview" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                <Rotate3d className="size-3.5" aria-hidden /> Drag to rotate
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Technical details</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {[
                { icon: HardDrive, label: "File size", value: model.fileSize },
                { icon: FileBox, label: "Format", value: ".glb / .usdz" },
                { icon: Layers, label: "Polygons", value: model.polygons },
                { icon: Calendar, label: "Created", value: formatDate(model.createdAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <Icon className="size-4 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{model.name}</h1>
              <Badge status={model.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">Created {formatDate(model.createdAt)}</p>
          </div>

          <Card className="relative overflow-hidden p-5">
            <h2 className="text-sm font-semibold text-slate-900">QR Code</h2>
            <div className={cn("mt-4 flex flex-col gap-5 sm:flex-row sm:items-center", locked && "pointer-events-none select-none blur-sm")} aria-hidden={locked}>
              <div
                className="size-44 shrink-0 rounded-xl border border-slate-200 bg-white p-2 [&>svg]:size-full"
                role="img"
                aria-label={`QR code linking to ${url}`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-slate-500">Print it on packaging, flyers or in-store displays. Scanning opens the model in AR — no app needed.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={downloadPng} tabIndex={locked ? -1 : 0}>
                    <Download className="size-4" aria-hidden /> Download QR (PNG)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={downloadSvg} tabIndex={locked ? -1 : 0}>
                    <Download className="size-4" aria-hidden /> Download QR (SVG)
                  </Button>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <p id="qr-color" className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Customize color
                  </p>
                  <div role="radiogroup" aria-labelledby="qr-color" className="mt-2 flex gap-3">
                    {swatches.map((s) => (
                      <button
                        key={s.value}
                        role="radio"
                        aria-checked={color === s.value}
                        aria-label={s.name}
                        title={s.name}
                        tabIndex={locked ? -1 : 0}
                        onClick={() => setColor(s.value)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          s.className,
                          color === s.value ? "ring-2 ring-slate-900/80" : "hover:scale-110",
                        )}
                      >
                        {color === s.value && <Check className="size-4 text-white" strokeWidth={3} aria-hidden />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 p-6 text-center backdrop-blur-[1px]">
                <div className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Lock className="size-5" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">Unlock AR hosting to get your QR code</p>
                <Button className="mt-4" onClick={unlock} disabled={paying}>
                  {paying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                  {paying ? "Redirecting to Stripe…" : "Checkout with Stripe ($4.99)"}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <label htmlFor="share-link" className="text-sm font-semibold text-slate-900">
              Share link
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="share-link"
                readOnly
                value={locked ? "Unlock to generate your link" : url}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 font-mono text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
              />
              <Button onClick={copyLink} disabled={locked} className="shrink-0">
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Scans over the last 30 days</h2>
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{last30.toLocaleString()}</p>
              </div>
              {!locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700">
                  <TrendingUp className="size-3.5" aria-hidden /> 12.4%
                </span>
              )}
            </div>
            <div className="mt-4">
              {locked ? (
                <div className="grid h-44 place-items-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
                  Scans will appear here once the model is live.
                </div>
              ) : (
                <ScanChart data={series} />
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden /> Back to Dashboard
    </Link>
  );
}
