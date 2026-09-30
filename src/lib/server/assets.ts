import "server-only";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, draco, prune, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { HostNotAllowedError, PermanentAssetError } from "@/lib/server/errors";

export { HostNotAllowedError, PermanentAssetError };

const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 90_000;

export const ASSET_LIMITS = { glb: 150 * 1024 * 1024, usdz: 150 * 1024 * 1024, zip: 300 * 1024 * 1024 } as const;

function assertAllowedUrl(raw: string, allowedHosts: string[]) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PermanentAssetError(`Invalid asset URL`);
  }
  const insecureOk = process.env.NODE_ENV !== "production" && url.protocol === "http:";
  if (url.protocol !== "https:" && !insecureOk) throw new PermanentAssetError(`Asset URL must be https`);
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new HostNotAllowedError(`Asset host ${url.hostname} is not in ENGINE_ASSET_HOSTS`);
  }
  return url;
}

/** Downloads a remote file with a host allowlist (re-checked on every redirect), a timeout and a hard size cap. */
export async function downloadAsset(rawUrl: string, allowedHosts: string[], maxBytes: number) {
  let url = assertAllowedUrl(rawUrl, allowedHosts);
  const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);

  for (let hop = 0; ; hop++) {
    const res = await fetch(url, { redirect: "manual", signal });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (hop >= MAX_REDIRECTS) throw new PermanentAssetError("Too many redirects");
      url = assertAllowedUrl(new URL(res.headers.get("location")!, url).toString(), allowedHosts);
      continue;
    }
    if (res.status >= 400 && res.status < 500) throw new PermanentAssetError(`Asset download failed: HTTP ${res.status}`);
    if (!res.ok || !res.body) throw new Error(`Asset download failed: HTTP ${res.status}`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new PermanentAssetError(`Asset exceeds ${maxBytes} bytes`);

    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength;
      if (total > maxBytes) throw new PermanentAssetError(`Asset exceeds ${maxBytes} bytes`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, total);
  }
}

export function assertGlb(bytes: Uint8Array) {
  // Binary glTF header: magic "glTF", version 2
  const ok = bytes.byteLength >= 12 && Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "glTF" && bytes[4] === 2;
  if (!ok) throw new PermanentAssetError("Downloaded file is not a glTF 2.0 binary (.glb)");
}

export function assertUsdz(bytes: Uint8Array) {
  // USDZ is an uncompressed zip archive: local file header "PK\x03\x04"
  const ok = bytes.byteLength >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!ok) throw new PermanentAssetError("Downloaded file is not a .usdz archive");
}

let ioPromise: Promise<NodeIO> | undefined;

function getIO() {
  return (ioPromise ??= (async () =>
    new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    }))());
}

/** Draco-compresses mesh geometry. Returns the original bytes if compression doesn't make the file smaller. */
export async function compressGlb(input: Uint8Array) {
  const io = await getIO();
  let doc;
  try {
    doc = await io.readBinary(input);
  } catch (err) {
    throw new PermanentAssetError(`Could not parse .glb: ${(err as Error).message}`);
  }
  await doc.transform(dedup(), prune(), weld(), draco({ method: "edgebreaker" }));
  const output = await io.writeBinary(doc);
  return output.byteLength < input.byteLength ? output : input;
}
