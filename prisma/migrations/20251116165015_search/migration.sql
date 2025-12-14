/*
  Warnings:

  - You are about to drop the column `friends` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "friends",
ADD COLUMN     "friendIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
