/*
  Warnings:

  - You are about to drop the `Audio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Audio";

-- CreateTable
CREATE TABLE "public"."audio" (
    "id" INTEGER NOT NULL DEFAULT 0,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "data" BYTEA NOT NULL,
    "hash" TEXT NOT NULL,
    "coverImage" BYTEA,
    "coverMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_hash_key" ON "public"."audio"("hash");
