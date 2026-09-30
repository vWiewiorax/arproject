"use client";

import { useState } from "react";

export function ScanChart({ data }: { data: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const h = 180;
  const pad = { t: 12, b: 24, l: 0, r: 0 };
  const max = Math.max(1, ...data) * 1.15;
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${h - pad.b} L${x(0)},${h - pad.b} Z`;

  const dayLabel = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (data.length - 1 - i));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Line chart of daily scans over the last ${data.length} days`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="scan-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1="0" x2={w} y1={pad.t + t * (h - pad.t - pad.b)} y2={pad.t + t * (h - pad.t - pad.b)} stroke="#e2e8f0" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="url(#scan-area)" />
        <path d={line} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={h - pad.b} stroke="#c7d2fe" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover !== null && (
        <>
          <div
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow"
            style={{ left: `${(x(hover) / w) * 100}%`, top: `${(y(data[hover]) / h) * 176}px` }}
          />
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: `${Math.min(90, Math.max(10, (x(hover) / w) * 100))}%`, top: `${(y(data[hover]) / h) * 176 - 10}px` }}
          >
            <span className="font-semibold tabular-nums">{data[hover]}</span> scans · {dayLabel(hover)}
          </div>
        </>
      )}
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{dayLabel(0)}</span>
        <span>{dayLabel(Math.floor(data.length / 2))}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
