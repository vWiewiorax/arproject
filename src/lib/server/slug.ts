import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** URL-safe, unguessable id for the public viewer link (62^10 ≈ 8e17). */
export function viewerSlug(length = 10): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Rejection sampling: 248 = 62 * 4, keeps the distribution uniform
    if (bytes[i] < 248) out += ALPHABET[bytes[i] % 62];
  }
  return out.length === length ? out : viewerSlug(length);
}
