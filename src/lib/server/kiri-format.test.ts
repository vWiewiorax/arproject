import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { PermanentAssetError } from "./errors";
import { extractGlbFromZip, isKiriInProgress, parseKiriWebhook, tokenMatches } from "./kiri-format";

const glb = (size: number) => {
  const b = new Uint8Array(size);
  b.set([0x67, 0x6c, 0x54, 0x46, 2]);
  return b;
};

describe("parseKiriWebhook", () => {
  it("accepts numeric and string statuses", () => {
    expect(parseKiriWebhook('{"serialize":"abc","status":2}')).toEqual({ success: true, data: { serialize: "abc", status: 2 } });
    expect(parseKiriWebhook('{"serialize":"abc","status":"1"}')).toEqual({ success: true, data: { serialize: "abc", status: 1 } });
    expect(parseKiriWebhook('{"serialize":"abc"}')).toEqual({ success: true, data: { serialize: "abc", status: undefined } });
  });
  it("rejects bad bodies", () => {
    expect(parseKiriWebhook("nope").success).toBe(false);
    expect(parseKiriWebhook('{"status":2}').success).toBe(false);
    expect(parseKiriWebhook('{"serialize":""}').success).toBe(false);
  });
  it("classifies in-progress statuses", () => {
    expect([-1, 0, 3].every(isKiriInProgress)).toBe(true);
    expect([1, 2, 4].some(isKiriInProgress)).toBe(false);
  });
});

describe("tokenMatches", () => {
  it("compares tokens", () => {
    expect(tokenMatches("secret-token-123456", "secret-token-123456")).toBe(true);
    expect(tokenMatches("secret-token-12345", "secret-token-123456")).toBe(false);
    expect(tokenMatches(null, "secret-token-123456")).toBe(false);
  });
});

describe("extractGlbFromZip", () => {
  it("returns the largest .glb and ignores other files", () => {
    const zip = zipSync({ "model/texture.jpg": new Uint8Array(5000), "model/preview.glb": glb(100), "model/scan.GLB": glb(400) });
    expect(extractGlbFromZip(zip, 1000).byteLength).toBe(400);
  });
  it("rejects archives without a glb, corrupt archives and oversized entries", () => {
    expect(() => extractGlbFromZip(zipSync({ "a.obj": new Uint8Array(10) }), 1000)).toThrow(/no \.glb/);
    expect(() => extractGlbFromZip(new TextEncoder().encode("not a zip"), 1000)).toThrow(PermanentAssetError);
    expect(() => extractGlbFromZip(zipSync({ "big.glb": glb(2000) }), 1000)).toThrow(/exceeds/);
  });
});
