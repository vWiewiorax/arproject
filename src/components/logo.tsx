import { Box } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
        <Box className="size-5" strokeWidth={2.25} aria-hidden />
      </div>
      {!compact && <span className="text-lg font-semibold tracking-tight text-slate-900">Arcade3D</span>}
    </div>
  );
}
