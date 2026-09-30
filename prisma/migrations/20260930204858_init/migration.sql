-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeviceOs" AS ENUM ('IOS', 'ANDROID', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "credits_remaining" INTEGER NOT NULL DEFAULT 0,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'PROCESSING',
    "video_source_url" TEXT NOT NULL,
    "engine_job_id" TEXT,
    "glb_s3_url" TEXT,
    "usdz_s3_url" TEXT,
    "glb_size_bytes" INTEGER,
    "viewer_slug" TEXT,
    "qr_color_hex" TEXT NOT NULL DEFAULT '#0f172a',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "scanned_at_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_os" "DeviceOs" NOT NULL,
    "country_code" CHAR(2),

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "models_engine_job_id_key" ON "models"("engine_job_id");

-- CreateIndex
CREATE UNIQUE INDEX "models_viewer_slug_key" ON "models"("viewer_slug");

-- CreateIndex
CREATE INDEX "models_user_id_created_at_idx" ON "models"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_model_id_scanned_at_timestamp_idx" ON "analytics"("model_id", "scanned_at_timestamp");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
