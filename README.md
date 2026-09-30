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
   or `{ "event_id", "job_id", "status": "failed", "error": "…" }`. Provider-neutral; KIRI uses its own route below.
3. Looks up the `Model` by `engineJobId`; already-handled jobs return `200 ignored` (at-least-once delivery safe).
4. Downloads `.glb` / `.usdz` (host allowlist `ENGINE_ASSET_HOSTS` re-checked on redirects, 150 MB cap, 90 s timeout), validates file magic, Draco-compresses the `.glb`.
5. Uploads to S3/R2 under content-addressed keys `models/<modelId>/<sha256>.glb` with `immutable` cache headers.
6. Atomically flips `PROCESSING → COMPLETED` with the CDN URLs and a random 10-char `viewerSlug`; the QR code encodes `VIEWER_BASE_URL/v/<viewerSlug>`.

Responses: `2xx` handled (don't retry) · `4xx` bad request · `5xx` transient error (engine should retry). Corrupt / disallowed assets mark the model `FAILED` with `failureReason`.

## 3D engine: KIRI Engine

Why KIRI: self-serve REST API that takes an MP4 (≤1080p, ≤3 min) or 20–300 photos and returns `.glb`/`.usdz`, with webhooks and status polling, $1 per model. (Luma's API is image/video generation only; Polycam's Reconstruction API is Enterprise-only, limited availability and photos-only.)

Flow:

1. `startKiriJob(modelId, source)` (`src/lib/server/kiri-sync.ts`) uploads the capture to KIRI Photo Scan (`fileFormat=glb`, auto object masking) and stores the returned `serialize` as `Model.engineJobId`.
2. KIRI calls `POST /api/webhooks/kiri?token=<KIRI_WEBHOOK_TOKEN>` with `{ serialize, status }`. The route checks the token, answers `200` immediately and syncs in the background.
3. `syncKiriJob` never trusts the webhook body: it re-reads the status via `getStatus`, fetches the signed zip via `getModelZip`, extracts the `.glb`, then reuses the same Draco → S3/R2 → `COMPLETED` + viewer slug pipeline as the generic webhook.
4. `GET /api/cron/kiri-sync` (`Authorization: Bearer <CRON_SECRET>`) re-syncs `PROCESSING` jobs older than 2 min, covering missed webhooks (KIRI retries only 3×, and deletes models after 3 days).

No `.usdz` is requested (each KIRI job outputs one format and costs a credit): `<model-viewer>` generates USDZ for iOS Quick Look from the `.glb` when `ios-src` is omitted.

KIRI failures/expiry mark the model `FAILED`. A zip host missing from `ENGINE_ASSET_HOSTS` is treated as a config error and left `PROCESSING` so the cron retries after the fix.

## Tests

```bash
npm test
```
