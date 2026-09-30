import "server-only";
import { z } from "zod";
import { env } from "@/lib/server/env";

/** Thin client for https://docs.kiriengine.app (Photo Scan). */

export class KiriApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

const envelope = z.object({ code: z.number(), msg: z.string().nullish(), data: z.unknown() });

async function kiri<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const { KIRI_API_BASE, KIRI_API_KEY } = env();
  if (!KIRI_API_KEY) throw new Error("KIRI_API_KEY is not configured");

  const res = await fetch(`${KIRI_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KIRI_API_KEY}`, ...init.headers },
    signal: AbortSignal.timeout(init.body ? 10 * 60_000 : 30_000),
  });
  const body = envelope.safeParse(await res.json().catch(() => null));
  if (!res.ok || !body.success || body.data.code !== 0) {
    const detail = body.success ? ` (code ${body.data.code}: ${body.data.msg ?? ""})` : "";
    throw new KiriApiError(`KIRI ${path.split("?")[0]} failed: HTTP ${res.status}${detail}`, res.status, body.success ? body.data.code : undefined);
  }
  return schema.parse(body.data.data);
}

export type KiriSource = { kind: "video"; file: Blob } | { kind: "images"; files: Blob[] };

/** Starts a Photo Scan job that outputs .glb. Returns KIRI's `serialize` job id. Costs 1 credit. */
export async function createKiriJob(source: KiriSource) {
  const form = new FormData();
  let path: string;
  if (source.kind === "video") {
    // KIRI limits: <= 1920x1080, <= 3 minutes.
    path = "/v1/open/photo/video";
    form.append("videoFile", source.file, "capture.mp4");
  } else {
    if (source.files.length < 20 || source.files.length > 300) {
      throw new Error("KIRI Photo Scan needs between 20 and 300 images");
    }
    path = "/v1/open/photo/image";
    source.files.forEach((f, i) => form.append("imagesFiles", f, `frame-${String(i).padStart(3, "0")}.jpg`));
  }
  form.append("fileFormat", "glb");
  form.append("modelQuality", "1"); // medium: sensible polycount for mobile WebAR
  form.append("textureQuality", "1"); // 2K
  form.append("isMask", "1"); // auto object masking: drop the background around products

  const data = await kiri(path, z.object({ serialize: z.string().min(1) }), { method: "POST", body: form });
  return data.serialize;
}

export async function getKiriStatus(serialize: string) {
  const data = await kiri(`/v1/open/model/getStatus?serialize=${encodeURIComponent(serialize)}`, z.object({ status: z.number() }));
  return data.status;
}

/** Signed zip download link, valid for 60 minutes. */
export async function getKiriModelZipUrl(serialize: string) {
  const data = await kiri(`/v1/open/model/getModelZip?serialize=${encodeURIComponent(serialize)}`, z.object({ modelUrl: z.url() }));
  return data.modelUrl;
}
