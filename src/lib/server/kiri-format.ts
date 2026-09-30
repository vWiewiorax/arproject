import { createHash, timingSafeEqual } from "node:crypto";
import { unzipSync } from "fflate";
import { z } from "zod";
import { PermanentAssetError } from "./errors";

/** `status` values from KIRI's getStatus endpoint and webhook. */
export const KIRI_STATUS = {
  UPLOADING: -1,
  PROCESSING: 0,
  FAILED: 1,
  SUCCESSFUL: 2,
  QUEUING: 3,
  EXPIRED: 4,
} as const;

const IN_PROGRESS: number[] = [KIRI_STATUS.UPLOADING, KIRI_STATUS.PROCESSING, KIRI_STATUS.QUEUING];
export const isKiriInProgress = (status: number) => IN_PROGRESS.includes(status);

/** KIRI business `code`s returned by getModelZip. */
export const KIRI_CODE = { PROCESSING: 2000, FAILED: 2001, EXPIRED: 2002, QUEUED: 2008 } as const;

const webhookSchema = z.object({
  serialize: z.string().min(1).max(128),
  status: z.union([z.number(), z.string()]).optional(),
});

/** KIRI posts `{ serialize, status }`. The status is only a hint; the sync always re-reads it from the API. */
export function parseKiriWebhook(rawBody: string) {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { success: false as const, error: "Body is not valid JSON" };
  }
  const r = webhookSchema.safeParse(json);
  if (!r.success) return { success: false as const, error: r.error.issues.map((i) => i.message).join("; ") };
  const status = r.data.status === undefined || r.data.status === "" ? NaN : Number(r.data.status);
  return { success: true as const, data: { serialize: r.data.serialize, status: Number.isInteger(status) ? status : undefined } };
}

export function tokenMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const GLB_ENTRY = /\.glb$/i;

/** KIRI returns a zip; pull out the (largest) .glb. Declared sizes are checked before inflating. */
export function extractGlbFromZip(zip: Uint8Array, maxBytes: number) {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip, {
      filter: (f) => {
        if (!GLB_ENTRY.test(f.name) || f.name.startsWith("__MACOSX/")) return false;
        if (f.originalSize > maxBytes) throw new PermanentAssetError(`${f.name} exceeds ${maxBytes} bytes`);
        return true;
      },
    });
  } catch (err) {
    if (err instanceof PermanentAssetError) throw err;
    throw new PermanentAssetError("KIRI model archive is not a valid zip");
  }
  const glbs = Object.values(entries).sort((a, b) => b.byteLength - a.byteLength);
  if (!glbs[0]) throw new PermanentAssetError("KIRI model archive contains no .glb file");
  if (glbs[0].byteLength > maxBytes) throw new PermanentAssetError(`.glb exceeds ${maxBytes} bytes`);
  return glbs[0];
}
