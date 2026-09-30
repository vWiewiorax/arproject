# Arcade3D — 3D / WebAR generation SaaS

Next.js 15 (App Router) · Tailwind 4 · Prisma/PostgreSQL · S3 or Cloudflare R2.

## Setup

```bash
cp .env.example .env      # fill in DB, S3/R2, webhook secret
npm install               # runs prisma generate
npm run db:migrate
npm run dev
```

## 3D engine webhook — `POST /api/webhooks/engine`

Source: `src/app/api/webhooks/engine/route.ts`

1. Verifies `x-engine-signature: t=<unix>,v1=<hex>` = HMAC-SHA256(`ENGINE_WEBHOOK_SECRET`, `"<t>.<raw body>"`), 5 min replay window.
2. Validates the payload (`src/lib/server/engine-webhook.ts`):
   ```json
   { "event_id": "evt_1", "job_id": "luma_123", "status": "completed",
     "assets": { "glb": "https://…/model.glb", "usdz": "https://…/model.usdz" } }
   ```
   or `{ "event_id", "job_id", "status": "failed", "error": "…" }`. Luma/Polycam payloads should be mapped to this shape.
3. Looks up the `Model` by `engineJobId`; already-handled jobs return `200 ignored` (at-least-once delivery safe).
4. Downloads `.glb` / `.usdz` (host allowlist `ENGINE_ASSET_HOSTS` re-checked on redirects, 150 MB cap, 90 s timeout), validates file magic, Draco-compresses the `.glb`.
5. Uploads to S3/R2 under content-addressed keys `models/<modelId>/<sha256>.glb` with `immutable` cache headers.
6. Atomically flips `PROCESSING → COMPLETED` with the CDN URLs and a random 10-char `viewerSlug`; the QR code encodes `VIEWER_BASE_URL/v/<viewerSlug>`.

Responses: `2xx` handled (don't retry) · `4xx` bad request · `5xx` transient error (engine should retry). Corrupt / disallowed assets mark the model `FAILED` with `failureReason`.

## Tests

```bash
npm test
```
