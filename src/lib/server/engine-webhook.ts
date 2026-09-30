import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const SIGNATURE_HEADER = "x-engine-signature";
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Normalized engine webhook payload. Luma / Polycam use different shapes;
 * map them to this in `parseEnginePayload` when wiring a specific provider.
 */
export const enginePayloadSchema = z.discriminatedUnion("status", [
  z.object({
    event_id: z.string().min(1),
    job_id: z.string().min(1),
    status: z.literal("completed"),
    assets: z.object({ glb: z.url(), usdz: z.url().optional() }),
  }),
  z.object({
    event_id: z.string().min(1),
    job_id: z.string().min(1),
    status: z.literal("failed"),
    error: z.string().max(1000).optional(),
  }),
]);

export type EnginePayload = z.infer<typeof enginePayloadSchema>;

export function signPayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

/** Verifies a `t=<unix>,v1=<hex hmac-sha256("t.body")>` header and rejects stale timestamps (replay protection). */
export function verifySignature(rawBody: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || !/^[0-9a-f]{64}$/i.test(parts.v1)) return false;
  if (Math.abs(now / 1000 - t) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
  const received = Buffer.from(parts.v1, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function parseEnginePayload(rawBody: string) {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { success: false as const, error: "Body is not valid JSON" };
  }
  const result = enginePayloadSchema.safeParse(json);
  return result.success
    ? { success: true as const, data: result.data }
    : { success: false as const, error: z.prettifyError(result.error) };
}
