import { describe, expect, it } from "vitest";
import { parseEnginePayload, signPayload, verifySignature } from "./engine-webhook";
import { viewerSlug } from "./slug";

const secret = "test-secret-0123456789";
const body = JSON.stringify({ event_id: "evt_1", job_id: "job_1", status: "completed", assets: { glb: "https://a.test/m.glb" } });

describe("verifySignature", () => {
  it("accepts a valid signature", () => {
    expect(verifySignature(body, signPayload(body, secret), secret)).toBe(true);
  });

  it("rejects a tampered body, wrong secret, missing or malformed header", () => {
    const header = signPayload(body, secret);
    expect(verifySignature(body + " ", header, secret)).toBe(false);
    expect(verifySignature(body, header, "other-secret-0123456789")).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "garbage", secret)).toBe(false);
    expect(verifySignature(body, "t=1,v1=zz", secret)).toBe(false);
  });

  it("rejects timestamps outside the 5 minute tolerance", () => {
    const old = Math.floor(Date.now() / 1000) - 6 * 60;
    expect(verifySignature(body, signPayload(body, secret, old), secret)).toBe(false);
  });
});

describe("parseEnginePayload", () => {
  it("parses completed and failed events", () => {
    expect(parseEnginePayload(body).success).toBe(true);
    expect(parseEnginePayload(JSON.stringify({ event_id: "e", job_id: "j", status: "failed", error: "boom" })).success).toBe(true);
  });

  it("rejects invalid JSON and completed events without a glb URL", () => {
    expect(parseEnginePayload("{").success).toBe(false);
    expect(parseEnginePayload(JSON.stringify({ event_id: "e", job_id: "j", status: "completed", assets: {} })).success).toBe(false);
  });
});

describe("viewerSlug", () => {
  it("returns unique base62 slugs of the requested length", () => {
    const slugs = new Set(Array.from({ length: 1000 }, () => viewerSlug()));
    expect(slugs.size).toBe(1000);
    for (const s of slugs) expect(s).toMatch(/^[0-9a-zA-Z]{10}$/);
  });
});
