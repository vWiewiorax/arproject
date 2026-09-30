import "server-only";
import { prisma } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { ASSET_LIMITS, HostNotAllowedError, PermanentAssetError, downloadAsset } from "@/lib/server/assets";
import { KiriApiError, type KiriSource, createKiriJob, getKiriModelZipUrl, getKiriStatus } from "@/lib/server/kiri";
import { KIRI_CODE, KIRI_STATUS, extractGlbFromZip } from "@/lib/server/kiri-format";
import { type CompletionResult, completeModel, markFailed } from "@/lib/server/model-completion";

export type KiriSyncResult =
  | CompletionResult
  | { status: "pending"; kiriStatus: number }
  | { status: "failed"; reason: string };

/** Submits the capture to KIRI and links the job to the model. */
export async function startKiriJob(modelId: string, source: KiriSource) {
  const serialize = await createKiriJob(source);
  await prisma.model.update({ where: { id: modelId }, data: { engineJobId: serialize } });
  return serialize;
}

/**
 * Reads the job state from KIRI's API (never from the webhook body) and, if done, stores the model.
 * Idempotent: safe to run from the webhook and the cron sweep at the same time.
 * Throws on transient errors (network, S3, DB, disallowed asset host) so the model stays PROCESSING for a later retry.
 */
export async function syncKiriJob(model: { id: string; engineJobId: string; viewerSlug: string | null }): Promise<KiriSyncResult> {
  const kiriStatus = await getKiriStatus(model.engineJobId);
  if (kiriStatus === KIRI_STATUS.FAILED) return fail(model.id, "KIRI Engine could not reconstruct a 3D model from this capture");
  if (kiriStatus === KIRI_STATUS.EXPIRED) return fail(model.id, "KIRI Engine deleted the model before it was downloaded");
  if (kiriStatus !== KIRI_STATUS.SUCCESSFUL) return { status: "pending", kiriStatus };

  let zipUrl: string;
  try {
    zipUrl = await getKiriModelZipUrl(model.engineJobId);
  } catch (err) {
    if (err instanceof KiriApiError) {
      if (err.code === KIRI_CODE.FAILED) return fail(model.id, "KIRI Engine could not reconstruct a 3D model from this capture");
      if (err.code === KIRI_CODE.EXPIRED) return fail(model.id, "KIRI Engine deleted the model before it was downloaded");
      if (err.code === KIRI_CODE.PROCESSING || err.code === KIRI_CODE.QUEUED) return { status: "pending", kiriStatus };
    }
    throw err;
  }

  try {
    const zip = await downloadAsset(zipUrl, env().ENGINE_ASSET_HOSTS, ASSET_LIMITS.zip);
    const glb = extractGlbFromZip(zip, ASSET_LIMITS.glb);
    // No .usdz: <model-viewer> generates one on the fly for iOS Quick Look when ios-src is omitted.
    return await completeModel(model, glb, null);
  } catch (err) {
    if (err instanceof PermanentAssetError && !(err instanceof HostNotAllowedError)) return fail(model.id, err.message);
    throw err;
  }
}

async function fail(modelId: string, reason: string) {
  await markFailed(modelId, reason);
  return { status: "failed" as const, reason };
}
