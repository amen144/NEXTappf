/*
  Warnings:

  - A unique constraint covering the columns `[hash]` on the table `Audio` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hash` to the `Audio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Audio" ADD COLUMN     "hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Audio_hash_key" ON "public"."Audio"("hash");
