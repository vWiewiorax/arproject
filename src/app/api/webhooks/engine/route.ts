import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { SIGNATURE_HEADER, parseEnginePayload, verifySignature } from "@/lib/server/engine-webhook";
import { ASSET_LIMITS, PermanentAssetError, downloadAsset } from "@/lib/server/assets";
import { completeModel, markFailed } from "@/lib/server/model-completion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

/**
 * Webhook from the 3D generation engine.
 *
 * 2xx  -> handled (or intentionally ignored); the engine should not retry.
 * 4xx  -> the request itself is bad (signature / payload / unknown job).
 * 5xx  -> transient failure (network, S3, DB); the engine should retry the delivery.
 */
export async function POST(req: Request) {
  const { ENGINE_WEBHOOK_SECRET, ENGINE_ASSET_HOSTS } = env();

  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get(SIGNATURE_HEADER), ENGINE_WEBHOOK_SECRET)) {
    return json({ error: "Invalid signature" }, 401);
  }

  const parsed = parseEnginePayload(rawBody);
  if (!parsed.success) return json({ error: parsed.error }, 400);
  const payload = parsed.data;

  const model = await prisma.model.findUnique({
    where: { engineJobId: payload.job_id },
    select: { id: true, status: true, viewerSlug: true },
  });
  if (!model) return json({ error: `Unknown job ${payload.job_id}` }, 404);

  // Engines deliver at-least-once; anything not PROCESSING was already handled.
  if (model.status !== "PROCESSING") {
    return json({ status: "ignored", reason: `model already ${model.status.toLowerCase()}` });
  }

  if (payload.status === "failed") {
    await markFailed(model.id, payload.error ?? "3D engine reported a failure");
    return json({ status: "failed", modelId: model.id });
  }

  try {
    const [glbRaw, usdz] = await Promise.all([
      downloadAsset(payload.assets.glb, ENGINE_ASSET_HOSTS, ASSET_LIMITS.glb),
      payload.assets.usdz ? downloadAsset(payload.assets.usdz, ENGINE_ASSET_HOSTS, ASSET_LIMITS.usdz) : null,
    ]);
    return json(await completeModel(model, glbRaw, usdz));
  } catch (err) {
    if (err instanceof PermanentAssetError) {
      await markFailed(model.id, err.message);
      return json({ status: "failed", modelId: model.id, error: err.message });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Viewer slug collision (astronomically unlikely) — let the engine retry with a fresh slug.
      console.warn("[engine-webhook] viewer slug collision", { modelId: model.id });
    } else {
      console.error("[engine-webhook] transient failure", { modelId: model.id, jobId: payload.job_id, err });
    }
    return json({ error: "Processing failed, please retry" }, 500);
  }
}

