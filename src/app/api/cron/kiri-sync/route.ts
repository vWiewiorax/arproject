import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { tokenMatches } from "@/lib/server/kiri-format";
import { syncKiriJob } from "@/lib/server/kiri-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STALE_AFTER_MS = 2 * 60_000;
const BATCH_SIZE = 20;

/**
 * Safety net for missed KIRI webhooks (KIRI retries only 3 times and deletes models after 3 days).
 * Call every few minutes with `Authorization: Bearer <CRON_SECRET>` (e.g. Vercel Cron).
 */
export async function GET(req: Request) {
  const { CRON_SECRET } = env();
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  const auth = req.headers.get("authorization");
  if (!tokenMatches(auth?.startsWith("Bearer ") ? auth.slice(7) : null, CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const models = await prisma.model.findMany({
    where: { status: "PROCESSING", engineJobId: { not: null }, createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, engineJobId: true, viewerSlug: true },
  });

  const results = [];
  for (const m of models) {
    try {
      const r = await syncKiriJob({ ...m, engineJobId: m.engineJobId! });
      results.push({ modelId: m.id, status: r.status });
    } catch (err) {
      console.error("[kiri-sync] transient failure", { modelId: m.id, err });
      results.push({ modelId: m.id, status: "error" });
    }
  }
  return NextResponse.json({ checked: models.length, results });
}
