import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { isKiriInProgress, parseKiriWebhook, tokenMatches } from "@/lib/server/kiri-format";
import { syncKiriJob } from "@/lib/server/kiri-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

/**
 * KIRI Engine status-change webhook. Configure the callback URL as
 * `https://<app>/api/webhooks/kiri?token=<KIRI_WEBHOOK_TOKEN>`.
 *
 * KIRI only sends `{ serialize, status }` and doesn't document its signature scheme, so the body is
 * treated as a hint: the job state is re-read from KIRI's API with our API key before anything changes.
 * The heavy work runs after the 200 response; if it fails, /api/cron/kiri-sync picks the job up.
 */
export async function POST(req: Request) {
  const { KIRI_WEBHOOK_TOKEN } = env();
  if (!KIRI_WEBHOOK_TOKEN) return json({ error: "KIRI webhook is not configured" }, 503);
  if (!tokenMatches(new URL(req.url).searchParams.get("token"), KIRI_WEBHOOK_TOKEN)) {
    return json({ error: "Invalid token" }, 401);
  }

  const parsed = parseKiriWebhook(await req.text());
  if (!parsed.success) return json({ error: parsed.error }, 400);
  const { serialize, status } = parsed.data;

  if (status !== undefined && isKiriInProgress(status)) return json({ status: "ignored", reason: "job still running" });

  const model = await prisma.model.findUnique({
    where: { engineJobId: serialize },
    select: { id: true, status: true, viewerSlug: true },
  });
  if (!model) return json({ error: `Unknown job ${serialize}` }, 404);
  if (model.status !== "PROCESSING") {
    return json({ status: "ignored", reason: `model already ${model.status.toLowerCase()}` });
  }

  after(async () => {
    try {
      const result = await syncKiriJob({ ...model, engineJobId: serialize });
      console.info("[kiri-webhook] synced", { modelId: model.id, serialize, status: result.status });
    } catch (err) {
      console.error("[kiri-webhook] sync failed; cron sweep will retry", { modelId: model.id, serialize, err });
    }
  });

  return json({ status: "accepted", modelId: model.id });
}
