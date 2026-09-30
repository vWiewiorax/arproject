import "server-only";
import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/server/env";

let client: S3Client | undefined;

function s3() {
  const e = env();
  return (client ??= new S3Client({
    region: e.S3_REGION,
    endpoint: e.S3_ENDPOINT,
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
  }));
}

/** Uploads under a content-addressed key so the CDN can cache it forever. Returns the public CDN URL. */
export async function uploadModelAsset(modelId: string, ext: "glb" | "usdz", body: Uint8Array, contentType: string) {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const key = `models/${modelId}/${hash}.${ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: env().S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${env().ASSET_CDN_BASE_URL}/${key}`;
}
