import "server-only";
import { prisma } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { assertGlb, assertUsdz, compressGlb } from "@/lib/server/assets";
import { uploadModelAsset } from "@/lib/server/storage";
import { viewerSlug } from "@/lib/server/slug";

export type CompletionResult =
  | { status: "completed"; modelId: string; viewerUrl: string; glbS3Url: string; usdzS3Url: string | null; compression: { originalBytes: number; storedBytes: number } }
  | { status: "ignored"; reason: string };

/**
 * Validates + Draco-compresses the engine output, stores it on S3/R2 and flips the model PROCESSING -> COMPLETED.
 * Throws PermanentAssetError for unusable assets; any other error is transient.
 */
export async function completeModel(
  model: { id: string; viewerSlug: string | null },
  glbRaw: Uint8Array,
  usdz: Uint8Array | null,
): Promise<CompletionResult> {
  assertGlb(glbRaw);
  if (usdz) assertUsdz(usdz);

  const glb = await compressGlb(glbRaw);

  const [glbS3Url, usdzS3Url] = await Promise.all([
    uploadModelAsset(model.id, "glb", glb, "model/gltf-binary"),
    usdz ? uploadModelAsset(model.id, "usdz", usdz, "model/vnd.usdz+zip") : null,
  ]);

  const slug = model.viewerSlug ?? viewerSlug();

  // Status guard makes concurrent duplicate deliveries safe: only one flips PROCESSING -> COMPLETED.
  const { count } = await prisma.model.updateMany({
    where: { id: model.id, status: "PROCESSING" },
    data: {
      status: "COMPLETED",
      glbS3Url,
      usdzS3Url,
      glbSizeBytes: glb.byteLength,
      viewerSlug: slug,
      completedAt: new Date(),
      failureReason: null,
    },
  });
  if (count === 0) return { status: "ignored", reason: "completed by a concurrent delivery" };

  return {
    status: "completed",
    modelId: model.id,
    viewerUrl: `${env().VIEWER_BASE_URL}/v/${slug}`,
    glbS3Url,
    usdzS3Url,
    compression: { originalBytes: glbRaw.byteLength, storedBytes: glb.byteLength },
  };
}

export async function markFailed(modelId: string, reason: string) {
  await prisma.model.updateMany({
    where: { id: modelId, status: "PROCESSING" },
    data: { status: "FAILED", failureReason: reason.slice(0, 1000) },
  });
}
