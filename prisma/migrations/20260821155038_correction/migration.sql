/*
  Warnings:

  - You are about to drop the `audio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."audio";

-- CreateTable
CREATE TABLE "public"."Audio" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "data" BYTEA NOT NULL,
    "hash" TEXT NOT NULL,
    "coverImage" BYTEA,
    "coverMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Audio_hash_key" ON "public"."Audio"("hash");
