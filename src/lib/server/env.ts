import "server-only";
import { z } from "zod";

const schema = z.object({
  ENGINE_WEBHOOK_SECRET: z.string().min(16),
  ENGINE_ASSET_HOSTS: z
    .string()
    .min(1)
    .transform((s) => s.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)),
  S3_ENDPOINT: z.url().optional().or(z.literal("").transform(() => undefined)),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  ASSET_CDN_BASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
  VIEWER_BASE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
});

let cached: z.infer<typeof schema> | undefined;

export function env() {
  return (cached ??= schema.parse(process.env));
}
